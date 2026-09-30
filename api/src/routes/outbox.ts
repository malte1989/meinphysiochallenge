import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

export function outboxRoutes(app: FastifyInstance, pool: Pool) {
  app.get('/api/outbox', async () =>
    (await pool.query('select * from ausfall.outbox order by id desc')).rows.map((r) => ({
      id: r.id, appointmentId: r.appointment_id, kanal: r.kanal, empfaenger: r.empfaenger, betreff: r.betreff,
      text: r.text, createdAt: new Date(r.created_at).toISOString(),
    })));
}
