import Fastify from 'fastify';
import { ZodError } from 'zod';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { ausfallRoutes } from './routes/ausfall.js';
import { faelleRoutes } from './routes/faelle.js';
import { outboxRoutes } from './routes/outbox.js';
import { patientenRoutes } from './routes/patienten.js';
import { simRoutes } from './routes/sim.js';

export function buildServer() {
  const app = Fastify({ logger: !process.env.VITEST });
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ fehler: 'ungueltige_eingabe', details: err.issues });
    app.log.error(err);
    return reply.code(500).send({ fehler: 'interner_fehler' });
  });
  app.get('/api/health', async () => ({ ok: true }));
  ausfallRoutes(app, pool);
  faelleRoutes(app, pool);
  patientenRoutes(app, pool);
  outboxRoutes(app, pool);
  simRoutes(app, pool);
  return app;
}

if (process.argv[1]?.endsWith('server.ts')) {
  await migrate();
  await seed();
  await buildServer().listen({ host: '0.0.0.0', port: 3000 });
}
