import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { MockTerminoClient } from '../src/termino/mock.js';
import { ConflictError } from '../src/termino/client.js';
import { applySnapshot } from '../src/termino/snapshot.js';

const NOW = '2026-09-07T05:40:00Z';
const client = new MockTerminoClient(pool);
const base = {
  locationId: 'loc_01', service: 'Krankengymnastik', source: 'api' as const,
  patient: { id: 'pat_x', name: 'Test Patient', birth_date: '1990-01-01', phone: null, email: null },
};
const byId = async (id: string) => (await pool.query('select id, status, source from termino.appointment where id=$1', [id])).rows[0];

describe('termino mock', () => {
  beforeEach(async () => {
    await migrate();
    await pool.query('truncate termino.appointment, termino.export_snapshot, termino.sim_state, ausfall.ausfall, ausfall.entscheidung, ausfall.outbox');
    await seed();
  });
  afterAll(async () => { await pool.end(); });

  test('book lehnt Überschneidung mit ConflictError ab', async () => {
    await expect(client.book({ ...base, practitionerId: 'prac_02', startsAt: '2026-09-07T06:00:00Z', durationMin: 20, at: NOW }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  test('book in freie Lücke klappt, cancel setzt status', async () => {
    const a = await client.book({ ...base, practitionerId: 'prac_02', startsAt: '2026-09-07T07:20:00Z', durationMin: 20, at: NOW });
    expect(a.id).toMatch(/^apt_api_/); expect(a.source).toBe('api');
    await client.cancel(a.id, NOW);
    expect((await byId(a.id)).status).toBe('cancelled');
  });

  test('Toggle 0805 spielt Diff ein, 0800 nimmt ihn zurück', async () => {
    expect((await applySnapshot(pool, '0805')).konflikte).toEqual([]);
    expect((await byId('apt_004498')).status).toBe('cancelled');
    expect(await byId('apt_006783')).toBeDefined();
    await applySnapshot(pool, '0800');
    expect((await byId('apt_004498')).status).toBe('booked');
    expect(await byId('apt_006783')).toBeUndefined();
  });

  test('Toggle zurück kollidiert mit eigener Buchung → Konflikt, Buchung bleibt', async () => {
    await applySnapshot(pool, '0805');
    const cem = await client.book({ ...base, practitionerId: 'prac_04', startsAt: '2026-09-09T07:20:00Z', durationMin: 20, at: NOW });
    const r = await applySnapshot(pool, '0800');
    expect(r.konflikte).toEqual(['apt_004498']);
    expect((await byId(cem.id)).status).toBe('booked');
  });
});
