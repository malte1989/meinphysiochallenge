import type { Pool } from 'pg';

const EXCLUSION_VIOLATION = '23P01';

/** Spielt einen Export-Stand ein. Fasst nur Zeilen mit source='export' an; eigene Buchungen bleiben erhalten. */
export async function applySnapshot(pool: Pool, stand: '0800' | '0805'): Promise<{ stand: string; konflikte: string[] }> {
  const konflikte: string[] = [];
  const client = await pool.connect();
  try {
    await client.query('begin');
    const snap = await client.query('select payload from termino.export_snapshot where stand=$1', [stand]);
    const target: any[] = snap.rows[0].payload.appointments;
    const targetIds = new Set(target.map((a) => a.id));

    await client.query(`delete from termino.appointment where source='export' and not (id = any($1::text[]))`, [[...targetIds]]);

    const existing = new Map<string, any>(
      (await client.query(`select * from termino.appointment where source='export'`)).rows.map((r) => [r.id, r]),
    );
    for (const a of target) {
      const e = existing.get(a.id);
      if (e && e.status === a.status && e.practitioner_id === a.practitioner_id && e.duration_min === a.duration_min
        && new Date(e.starts_at).getTime() === new Date(a.starts_at).getTime()) continue;
      await client.query('savepoint s');
      try {
        await client.query(
          `insert into termino.appointment (id, location_id, practitioner_id, service, starts_at, ends_at, duration_min, status, patient, booked_at, updated_at, source)
           values ($1,$2,$3,$4,$5::timestamptz,$5::timestamptz + make_interval(mins => $6),$6,$7,$8,$9,$10,'export')
           on conflict (id) do update set location_id=excluded.location_id, practitioner_id=excluded.practitioner_id,
             service=excluded.service, starts_at=excluded.starts_at, ends_at=excluded.ends_at, duration_min=excluded.duration_min,
             status=excluded.status, patient=excluded.patient, updated_at=excluded.updated_at
           where termino.appointment.source='export'`,
          [a.id, a.location_id, a.practitioner_id, a.service, a.starts_at, a.duration_min, a.status, a.patient, a.booked_at, a.updated_at],
        );
        await client.query('release savepoint s');
      } catch (err: any) {
        if (err.code !== EXCLUSION_VIOLATION) throw err;
        await client.query('rollback to savepoint s');
        konflikte.push(a.id);
      }
    }
    await client.query(`insert into termino.sim_state (id, stand) values (1,$1) on conflict (id) do update set stand=excluded.stand`, [stand]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
  return { stand, konflikte };
}
