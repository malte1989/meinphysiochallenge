import Fastify from 'fastify';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';

export function buildServer() {
  const app = Fastify({ logger: true });
  app.get('/api/health', async () => ({ ok: true }));
  return app;
}

if (process.argv[1]?.endsWith('server.ts')) {
  await migrate();
  await seed();
  await buildServer().listen({ host: '0.0.0.0', port: 3000 });
}
