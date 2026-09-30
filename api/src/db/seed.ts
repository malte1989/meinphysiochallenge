import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { config } from '../config.js';
import { pool } from './pool.js';

export const ANNA_ID = '2a3bbf28-bd84-438e-91ca-604f8cd93fb2';
/** Feste ID des Ausfalls aus dem Fall, damit Reset und Links stabil bleiben. */
export const SEED_AUSFALL_ID = '5a1e0000-0000-4000-8000-00000000a001';
const WOCHENTAG: Record<string, number> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5 };

const read = (name: string) => JSON.parse(readFileSync(join(config.dataDir, name), 'utf8'));
const isEmpty = async (p: Pool, table: string) => (await p.query(`select 1 from ${table} limit 1`)).rowCount === 0;

export async function insertAppointments(p: Pool, appointments: any[]): Promise<void> {
  for (const a of appointments) {
    await p.query(
      `insert into termino.appointment (id, location_id, practitioner_id, service, starts_at, ends_at, duration_min, status, patient, booked_at, updated_at, source)
       values ($1,$2,$3,$4,$5::timestamptz,$5::timestamptz + make_interval(mins => $6),$6,$7,$8,$9,$10,'export')`,
      [a.id, a.location_id, a.practitioner_id, a.service, a.starts_at, a.duration_min, a.status, a.patient, a.booked_at, a.updated_at],
    );
  }
}

export async function seed(): Promise<void> {
  const p = pool;
  if (await isEmpty(p, 'stamm.praxis')) {
    for (const x of read('praxen.json'))
      await p.query('insert into stamm.praxis values ($1,$2,$3,$4)', [x.id, x.name, x.adresse, x.termino_location_id]);
  }
  if (await isEmpty(p, 'stamm.therapeut')) {
    for (const t of read('therapeuten.json')) {
      await p.query('insert into stamm.therapeut values ($1,$2,$3,$4,$5)', [t.id, t.vorname, t.nachname, t.qualifikationen, t.termino_practitioner_id]);
      for (const [tag, bloecke] of Object.entries<any[]>(t.arbeitszeiten))
        for (const b of bloecke)
          await p.query('insert into stamm.arbeitszeit values ($1,$2,$3,$4,$5)', [t.id, WOCHENTAG[tag], b.praxis_id, b.von, b.bis]);
    }
  }
  if (await isEmpty(p, 'stamm.patient')) {
    for (const x of read('patienten.json'))
      await p.query('insert into stamm.patient values ($1,$2,$3,$4,$5,$6,$7)', [x.id, x.vorname, x.nachname, x.geburtsdatum, x.telefon, x.email, x.termino_patient_id]);
  }
  if (await isEmpty(p, 'stamm.verordnung')) {
    for (const v of read('verordnungen.json'))
      await p.query('insert into stamm.verordnung values ($1,$2,$3,$4,$5,$6,$7)', [v.id, v.patient_id, v.ausstellungsdatum, v.diagnosegruppe, v.heilmittel, v.verordnungsmenge, v.frequenz_pro_woche]);
  }
  if (await isEmpty(p, 'termino.export_snapshot')) {
    for (const stand of ['0800', '0805']) {
      const e = read(`termino_export_2026-09-07_${stand}.json`);
      await p.query('insert into termino.export_snapshot values ($1,$2,$3)', [stand, e.exported_at, e]);
    }
  }
  if (await isEmpty(p, 'termino.appointment')) {
    const e = read('termino_export_2026-09-07_0800.json');
    await insertAppointments(p, e.appointments);
    await p.query(`insert into termino.sim_state values (1,'0800') on conflict do nothing`);
  }
  if (await isEmpty(p, 'ausfall.ausfall')) {
    await p.query('insert into ausfall.ausfall (id, therapeut_id, von, bis, created_at) values ($1,$2,$3,$4,$5)', [SEED_AUSFALL_ID, ANNA_ID, '2026-09-06T22:00:00Z', '2026-09-07T22:00:00Z', config.now]);
  }
}
