import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { ANNA_ID, SEED_AUSFALL_ID } from '../db/seed.js';
import { runAutopilot } from '../domain/autopilot.js';
import { freieSlots } from '../domain/slots.js';
import { inputFuerTermin } from '../repo/load.js';
import { ConflictError } from '../termino/client.js';
import { MockTerminoClient } from '../termino/mock.js';
import { applySnapshot } from '../termino/snapshot.js';

const exportBody = z.object({ stand: z.enum(['0800', '0805']) });
const selbstBody = z.object({ appointmentId: z.string().min(1) });

export function simRoutes(app: FastifyInstance, pool: Pool) {
  app.get('/api/sim/export', async () => ({ stand: (await pool.query('select stand from termino.sim_state')).rows[0]?.stand ?? null }));

  app.post('/api/sim/export', async (req) => applySnapshot(pool, exportBody.parse(req.body).stand));

  /** Setzt die Demo zurück: Entscheidungen, Outbox, Verlängerung der Krankmeldung, eigene Buchungen, Verknüpfungen, Exportstand 08:00. */
  app.post('/api/sim/reset', async () => {
    await pool.query('truncate ausfall.entscheidung, ausfall.outbox');
    await pool.query('delete from ausfall.ausfall where id <> $1', [SEED_AUSFALL_ID]);
    await pool.query(
      `insert into ausfall.ausfall (id, therapeut_id, von, bis, created_at) values ($1,$2,'2026-09-06T22:00:00Z','2026-09-07T22:00:00Z',$3)
       on conflict (id) do update set bis = excluded.bis`, [SEED_AUSFALL_ID, ANNA_ID, config.now]);
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

  /** Demo: Die Patient:in bucht über den Link selbst einen Slot (source=patient) und storniert den alten Termin. */
  app.post('/api/sim/selbstbuchung', async (req, reply) => {
    const { appointmentId } = selbstBody.parse(req.body);
    const ctx = await inputFuerTermin(pool, appointmentId);
    if (!ctx) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    const { input } = ctx;
    const fall = runAutopilot(input).find((f) => f.appointment.id === appointmentId);
    if (!fall) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    if (fall.status === 'selbst_gebucht' || fall.status === 'umgebucht') return reply.code(409).send({ fehler: 'bereits_entschieden' });
    const slot = fall.vorschlag ?? freieSlots(fall, input, [])[0];
    if (!slot) return reply.code(409).send({ fehler: 'kein_slot' });
    const at = new Date(Date.parse(config.now) + 5 * 60_000).toISOString();
    const termino = new MockTerminoClient(pool);
    const a = fall.appointment;
    try {
      const neu = await termino.book({
        locationId: slot.locationId, practitionerId: slot.practitionerId, service: a.service, startsAt: slot.startsAt,
        durationMin: a.durationMin, patient: a.patient, source: 'patient', at,
      });
      if (a.status === 'booked') await termino.cancel(a.id, at);
      return { neuerTerminId: neu.id };
    } catch (e) {
      if (e instanceof ConflictError) return reply.code(409).send({ fehler: 'slot_belegt' });
      throw e;
    }
  });
}
