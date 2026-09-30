import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';

const q = (sql: string) => pool.query(sql);
const count = async (t: string) => (await q(`select count(*)::int n from ${t}`)).rows[0].n as number;

describe('seed', () => {
  beforeAll(async () => {
    await q('drop schema if exists stamm, termino, ausfall cascade');
  });
  afterAll(async () => { await pool.end(); });

  test('seed lädt Stammdaten, Export 08:00 und Annas Ausfall idempotent', async () => {
    await migrate(); await seed(); await seed();
    expect(await count('stamm.patient')).toBe(560);
    expect(await count('stamm.therapeut')).toBe(7);
    expect(await count('termino.appointment')).toBe(1927);
    expect(await count('termino.export_snapshot')).toBe(2);
    expect((await q('select stand from termino.sim_state')).rows[0].stand).toBe('0800');
    expect(await count('ausfall.ausfall')).toBe(1);
    const r = await q(`select count(*)::int n from termino.appointment where practitioner_id='prac_01' and status='booked' and starts_at >= '2026-09-06T22:00Z' and starts_at < '2026-09-07T22:00Z'`);
    expect(r.rows[0].n).toBe(14);
  });
});
