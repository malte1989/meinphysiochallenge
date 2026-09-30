import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { applySnapshot } from '../termino/snapshot.js';

const exportBody = z.object({ stand: z.enum(['0800', '0805']) });

export function simRoutes(app: FastifyInstance, pool: Pool) {
  app.get('/api/sim/export', async () => ({ stand: (await pool.query('select stand from termino.sim_state')).rows[0]?.stand ?? null }));

  app.post('/api/sim/export', async (req) => applySnapshot(pool, exportBody.parse(req.body).stand));

  /** Setzt die Demo zurück: Entscheidungen, Outbox, Verlängerung der Krankmeldung, eigene Buchungen, Verknüpfungen, Exportstand 08:00. */
  app.post('/api/sim/reset', async () => {
    await pool.query('truncate ausfall.entscheidung, ausfall.outbox');
    await pool.query(`update ausfall.ausfall set bis = '2026-09-07T22:00:00Z'`);
    await pool.query(`delete from termino.appointment where source <> 'export'`);
    const patienten: { id: string; termino_patient_id: string | null }[] = JSON.parse(readFileSync(join(config.dataDir, 'patienten.json'), 'utf8'));
    await pool.query(
      `update stamm.patient p set termino_patient_id = v.t
         from unnest($1::uuid[], $2::text[]) as v(id, t)
        where p.id = v.id and p.termino_patient_id is distinct from v.t`,
      [patienten.map((p) => p.id), patienten.map((p) => p.termino_patient_id)]);
    const r = await applySnapshot(pool, '0800');
    return { ok: true, konflikte: r.konflikte };
  });
}
