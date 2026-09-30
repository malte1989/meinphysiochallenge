import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

const params = z.object({ patientId: z.string().uuid() });
const body = z.object({ terminoPatientId: z.string().min(1) });
const UNIQUE_VIOLATION = '23505';

export function patientenRoutes(app: FastifyInstance, pool: Pool) {
  /** Führt einen unsicheren Treffer zusammen: schreibt die Termino-ID in den Stammdatensatz. */
  app.post('/api/patienten/:patientId/verknuepfen', async (req, reply) => {
    const { patientId } = params.parse(req.params);
    const { terminoPatientId } = body.parse(req.body);
    try {
      const r = await pool.query('update stamm.patient set termino_patient_id=$2 where id=$1', [patientId, terminoPatientId]);
      if (r.rowCount === 0) return reply.code(404).send({ fehler: 'nicht_gefunden' });
      return { ok: true };
    } catch (e: any) {
      if (e.code === UNIQUE_VIOLATION) return reply.code(409).send({ fehler: 'bereits_verknuepft' });
      throw e;
    }
  });
}
