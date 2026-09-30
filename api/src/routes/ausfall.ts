import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { runAutopilot } from '../domain/autopilot.js';
import { addDays, berlinWallToUtc } from '../domain/time.js';
import { loadInput } from '../repo/load.js';

const idParams = z.object({ id: z.string().uuid() });
const tag = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const anlegenBody = z.object({ therapeutId: z.string().uuid(), vonTag: tag, bisTag: tag });
const verlaengernBody = z.object({ bis: z.string().datetime() });

export function ausfallRoutes(app: FastifyInstance, pool: Pool) {
  const liste = async () => (await pool.query(
    `select a.id, t.vorname || ' ' || t.nachname as "therapeutName", a.von, a.bis
       from ausfall.ausfall a join stamm.therapeut t on t.id = a.therapeut_id order by a.nr`)).rows;

  /** Übersicht aller Ausfälle mit Anzahl betroffener und noch offener Termine. */
  app.get('/api/ausfall', async () => {
    const out = [];
    for (const a of await liste()) {
      const faelle = runAutopilot(await loadInput(pool, a.id));
      out.push({ ...a, anzahl: faelle.length, offen: faelle.filter((f) => f.status === 'offen').length });
    }
    return out;
  });

  app.get('/api/therapeuten', async () =>
    (await pool.query(`select id, vorname || ' ' || nachname as name, qualifikationen from stamm.therapeut order by nachname, vorname`)).rows);

  /** Simuliert die Krankmeldung einer weiteren Person (nur ein Datensatz, keine Anbindung an Personalsystem oder Benachrichtigung). */
  app.post('/api/ausfall', async (req, reply) => {
    const b = anlegenBody.parse(req.body);
    if (b.bisTag < b.vonTag) return reply.code(400).send({ fehler: 'bis_vor_beginn' });
    const t = await pool.query('select 1 from stamm.therapeut where id=$1', [b.therapeutId]);
    if (t.rowCount === 0) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    const { rows } = await pool.query(
      `insert into ausfall.ausfall (id, therapeut_id, von, bis, created_at) values (gen_random_uuid(),$1,$2,$3,$4) returning id`,
      [b.therapeutId, berlinWallToUtc(b.vonTag, '00:00'), berlinWallToUtc(addDays(b.bisTag, 1), '00:00'), config.now]);
    return reply.code(201).send({ id: rows[0].id });
  });

  app.get('/api/ausfall/:id/faelle', async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const ausfall = (await liste()).find((a) => a.id === id);
    if (!ausfall) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    const input = await loadInput(pool, id);
    const { rows } = await pool.query('select stand from termino.sim_state');
    return { ausfall, jetzt: config.now, exportStand: rows[0]?.stand ?? null, faelle: runAutopilot(input) };
  });

  /** Verlängert die Krankmeldung. Bestehende Entscheidungen bleiben, der Autopilot rechnet beim nächsten Abruf neu. */
  app.patch('/api/ausfall/:id', async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const { bis } = verlaengernBody.parse(req.body);
    const { rows } = await pool.query('select von from ausfall.ausfall where id=$1', [id]);
    if (!rows[0]) return reply.code(404).send({ fehler: 'nicht_gefunden' });
    if (new Date(bis) <= new Date(rows[0].von)) return reply.code(400).send({ fehler: 'bis_vor_beginn' });
    await pool.query('update ausfall.ausfall set bis=$2 where id=$1', [id, bis]);
    return { ok: true };
  });

  /** Diagnosegruppen mit Klartext und Quellen (data/diagnosegruppen.json), als Map nach Kürzel. */
  app.get('/api/diagnosegruppen', async () => {
    const liste: { code: string }[] = JSON.parse(readFileSync(join(config.dataDir, 'diagnosegruppen.json'), 'utf8'));
    return Object.fromEntries(liste.map((g) => [g.code, g]));
  });
}
