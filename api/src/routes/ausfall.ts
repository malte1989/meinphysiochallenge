import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { runAutopilot } from '../domain/autopilot.js';
import { loadInput } from '../repo/load.js';

const idParams = z.object({ id: z.string().uuid() });

export function ausfallRoutes(app: FastifyInstance, pool: Pool) {
  const liste = async () => (await pool.query(
    `select a.id, t.vorname || ' ' || t.nachname as "therapeutName", a.von, a.bis
       from ausfall.ausfall a join stamm.therapeut t on t.id = a.therapeut_id order by a.created_at desc`)).rows;

  app.get('/api/ausfall', async () => liste());

  app.get('/api/ausfall/:id/faelle', async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const ausfall = (await liste()).find((a) => a.id === id);
    if (!ausfall) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    const input = await loadInput(pool, id);
    const { rows } = await pool.query('select stand from termino.sim_state');
    return { ausfall, jetzt: config.now, exportStand: rows[0]?.stand ?? null, faelle: runAutopilot(input) };
  });
}
