import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { runAutopilot, slotsFuerFall } from '../domain/autopilot.js';
import { freieSlots } from '../domain/slots.js';
import type { Aktion, AutopilotInput, Fall } from '../domain/types.js';
import { type NachrichtArt, nachrichten } from '../outbox/messages.js';
import { inputFuerTermin } from '../repo/load.js';
import { ConflictError } from '../termino/client.js';
import { MockTerminoClient } from '../termino/mock.js';

const idParams = z.object({ appointmentId: z.string().min(1) });
const umbuchenBody = z.object({ practitionerId: z.string().min(1), startsAt: z.string().datetime() });
const absagenBody = z.object({ art: z.enum(['mit_link', 'ersatzlos', 'doppelbuchung']) });
const ABSAGE: Record<'mit_link' | 'ersatzlos' | 'doppelbuchung', { aktion: Aktion; nachricht: NachrichtArt }> = {
  mit_link: { aktion: 'abgesagt_mit_link', nachricht: 'abgesagt_mit_link' },
  ersatzlos: { aktion: 'ersatzlos_abgesagt', nachricht: 'ersatzlos_abgesagt' },
  doppelbuchung: { aktion: 'doppelbuchung_storniert', nachricht: 'doppelbuchung_storniert' },
};

export function faelleRoutes(app: FastifyInstance, pool: Pool) {
  const termino = new MockTerminoClient(pool);

  async function kontext(appointmentId: string): Promise<{ input: AutopilotInput; fall: Fall } | null> {
    const ctx = await inputFuerTermin(pool, appointmentId);
    if (!ctx) return null;
    const fall = runAutopilot(ctx.input).find((f) => f.appointment.id === appointmentId);
    return fall ? { input: ctx.input, fall } : null;
  }

  /** Reserviert die Entscheidung atomar (Primärschlüssel). false, wenn schon jemand entschieden hat. */
  const beanspruche = async (appointmentId: string, aktion: Aktion) =>
    ((await pool.query(
      'insert into ausfall.entscheidung (appointment_id, aktion, created_at) values ($1,$2,$3) on conflict do nothing',
      [appointmentId, aktion, config.now])).rowCount ?? 0) > 0;
  const gibFrei = (appointmentId: string) => pool.query('delete from ausfall.entscheidung where appointment_id=$1', [appointmentId]);

  async function schreibeOutbox(fall: Fall, art: NachrichtArt, neu?: Parameters<typeof nachrichten>[1]['neu']) {
    const tp = fall.appointment.patient;
    const kontakt = { telefon: fall.patient?.telefon ?? tp.phone, email: fall.patient?.email ?? tp.email };
    for (const m of nachrichten(art, { patient: tp, kontakt, alt: fall.appointment, neu }))
      await pool.query(
        'insert into ausfall.outbox (appointment_id, kanal, empfaenger, betreff, text, created_at) values ($1,$2,$3,$4,$5,$6)',
        [fall.appointment.id, m.kanal, m.empfaenger, m.betreff, m.text, config.now]);
  }

  app.get('/api/faelle/:appointmentId/slots', async (req, reply) => {
    const { appointmentId } = idParams.parse(req.params);
    const k = await kontext(appointmentId);
    if (!k) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    return slotsFuerFall(appointmentId, k.input);
  });

  app.post('/api/faelle/:appointmentId/umbuchen', async (req, reply) => {
    const { appointmentId } = idParams.parse(req.params);
    const body = umbuchenBody.parse(req.body);
    const k = await kontext(appointmentId);
    if (!k) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    if (k.fall.status !== 'offen') return reply.code(409).send({ fehler: 'bereits_entschieden' });

    const startsAt = new Date(body.startsAt).toISOString();
    const slot = freieSlots(k.fall, k.input, []).find((s) => s.practitionerId === body.practitionerId && s.startsAt === startsAt);
    if (!slot) return reply.code(409).send({ fehler: 'slot_belegt' });
    if (!(await beanspruche(appointmentId, 'umgebucht'))) return reply.code(409).send({ fehler: 'bereits_entschieden' });

    const original = k.fall.appointment;
    try {
      const neu = await termino.book({
        locationId: slot.locationId, practitionerId: slot.practitionerId, service: original.service, startsAt: slot.startsAt,
        durationMin: original.durationMin, patient: original.patient, source: 'api', at: config.now,
      });
      await termino.cancel(original.id, config.now);
      await pool.query('update ausfall.entscheidung set neuer_termin_id=$2 where appointment_id=$1', [appointmentId, neu.id]);
      await schreibeOutbox(k.fall, 'verschoben', { startsAt: slot.startsAt, praxisName: slot.praxisName, therapeutName: slot.therapeutName });
      return { neuerTerminId: neu.id };
    } catch (e) {
      await gibFrei(appointmentId);
      if (e instanceof ConflictError) return reply.code(409).send({ fehler: 'slot_belegt' });
      throw e;
    }
  });

  app.post('/api/faelle/:appointmentId/absagen', async (req, reply) => {
    const { appointmentId } = idParams.parse(req.params);
    const { art } = absagenBody.parse(req.body);
    const k = await kontext(appointmentId);
    if (!k) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    if (k.fall.status !== 'offen') return reply.code(409).send({ fehler: 'bereits_entschieden' });
    if (!(await beanspruche(appointmentId, ABSAGE[art].aktion))) return reply.code(409).send({ fehler: 'bereits_entschieden' });
    try {
      await termino.cancel(appointmentId, config.now);
      await schreibeOutbox(k.fall, ABSAGE[art].nachricht);
      return { ok: true };
    } catch (e) {
      await gibFrei(appointmentId);
      throw e;
    }
  });
}
