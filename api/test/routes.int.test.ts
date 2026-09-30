import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { pool } from '../src/db/pool.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';
import { buildServer } from '../src/server.js';

const app = buildServer();
const get = async (url: string) => (await app.inject({ method: 'GET', url })).json();
const post = (url: string, payload?: unknown) => app.inject({ method: 'POST', url, payload: payload as object });

async function faelle() {
  const [a] = await get('/api/ausfall');
  return (await get(`/api/ausfall/${a.id}/faelle`)) as { faelle: any[]; exportStand: string };
}
const fallVon = async (name: string) => (await faelle()).faelle.find((f) => f.appointment.patient.name === name);

describe('API', () => {
  beforeAll(async () => { await migrate(); await seed(); });
  beforeEach(async () => { expect((await post('/api/sim/reset')).statusCode).toBe(200); });
  afterAll(async () => { await app.close(); await pool.end(); });

  test('Fälle: 14 Stück, Anrufreihenfolge beginnt mit Sabine Czerny', async () => {
    const r = await faelle();
    expect(r.faelle).toHaveLength(14);
    expect(r.faelle[0].appointment.patient.name).toBe('Sabine Czerny');
    expect(r.exportStand).toBe('0800');
  });

  test('umbuchen doppelt: zweiter Aufruf 409 bereits_entschieden, nur eine Buchung und je ein SMS/E-Mail', async () => {
    const f = await fallVon('Kerstin Nowak');
    const body = { practitionerId: f.vorschlag.practitionerId, startsAt: f.vorschlag.startsAt };
    const erst = await post(`/api/faelle/${f.appointment.id}/umbuchen`, body);
    expect(erst.statusCode).toBe(200);
    const zweit = await post(`/api/faelle/${f.appointment.id}/umbuchen`, body);
    expect(zweit.statusCode).toBe(409);
    expect(zweit.json().fehler).toBe('bereits_entschieden');
    expect((await pool.query(`select count(*)::int n from termino.appointment where source='api'`)).rows[0].n).toBe(1);
    expect((await get('/api/outbox')).map((m: any) => m.kanal).sort()).toEqual(['email', 'sms']);
    expect((await fallVon('Kerstin Nowak')).status).toBe('umgebucht');
  });

  test('umbuchen in belegten Slot: 409 slot_belegt, Fall bleibt offen', async () => {
    const f = await fallVon('Kerstin Nowak');
    const r = await post(`/api/faelle/${f.appointment.id}/umbuchen`, { practitionerId: 'prac_02', startsAt: '2026-09-07T06:00:00.000Z' });
    expect(r.statusCode).toBe(409);
    expect(r.json().fehler).toBe('slot_belegt');
    expect((await fallVon('Kerstin Nowak')).status).toBe('offen');
    expect((await pool.query('select count(*)::int n from ausfall.entscheidung')).rows[0].n).toBe(0);
  });

  test('absagen mit Link: Gisela (keine Telefonnummer) bekommt nur E-Mail mit Link', async () => {
    const f = await fallVon('Gisela Neumann');
    expect((await post(`/api/faelle/${f.appointment.id}/absagen`, { art: 'mit_link' })).statusCode).toBe(200);
    const outbox = await get('/api/outbox');
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ kanal: 'email', empfaenger: 'gisela.neumann@example.com' });
    expect(outbox[0].text).toContain('termino.example/buchen');
    expect((await fallVon('Gisela Neumann')).status).toBe('abgesagt');
  });

  test('verknüpfen: Katrin Meyer wird exakt, doppelte Termino-ID → 409', async () => {
    const f = await fallVon('Katrin Meier');
    expect(f.match).toBe('unsicher');
    const ok = await post(`/api/patienten/${f.patient.id}/verknuepfen`, { terminoPatientId: 'pat_02538' });
    expect(ok.statusCode).toBe(200);
    expect((await fallVon('Katrin Meier')).match).toBe('exakt');
    const [yasmin] = (await pool.query(`select id from stamm.patient where nachname='Vogt' and vorname='Yasmin'`)).rows;
    const doppelt = await post(`/api/patienten/${yasmin.id}/verknuepfen`, { terminoPatientId: 'pat_02538' });
    expect(doppelt.statusCode).toBe(409);
    expect(doppelt.json().fehler).toBe('bereits_verknuepft');
  });

  test('Toggle 0805: Cem bekommt Sofias freien Slot Mi 09.09. 09:20 angeboten, bei 0800 nicht', async () => {
    const cem = await fallVon('Cem Oeztuerk');
    const hat = async () => (await get(`/api/faelle/${cem.appointment.id}/slots`))
      .some((s: any) => s.practitionerId === 'prac_04' && s.startsAt === '2026-09-09T07:20:00.000Z');
    expect(await hat()).toBe(false);
    expect((await post('/api/sim/export', { stand: '0805' })).json().konflikte).toEqual([]);
    expect((await faelle()).exportStand).toBe('0805');
    expect(await hat()).toBe(true);
    await post('/api/sim/export', { stand: '0800' });
    expect(await hat()).toBe(false);
  });

  test('ungültige Eingabe ergibt 400', async () => {
    const f = await fallVon('Kerstin Nowak');
    expect((await post(`/api/faelle/${f.appointment.id}/absagen`, { art: 'quatsch' })).statusCode).toBe(400);
  });

  // Krankmeldung verlängern
  test('PATCH bis Di 08.09. nimmt Annas Termine vom 08.09. als Fälle auf, bestehende Entscheidungen bleiben', async () => {
    const [a] = await get('/api/ausfall');
    const f = await fallVon('Kerstin Nowak');
    await post(`/api/faelle/${f.appointment.id}/absagen`, { art: 'mit_link' });
    const vorher = (await faelle()).faelle.length;
    const r = await app.inject({ method: 'PATCH', url: `/api/ausfall/${a.id}`, payload: { bis: '2026-09-08T22:00:00.000Z' } });
    expect(r.statusCode).toBe(200);
    const nachher = await faelle();
    expect(nachher.faelle.length).toBeGreaterThan(vorher);
    expect(nachher.faelle.some((x) => x.appointment.startsAt.startsWith('2026-09-08'))).toBe(true);
    expect(nachher.faelle.find((x) => x.appointment.id === f.appointment.id).status).toBe('abgesagt');
  });

  test('PATCH mit bis vor dem Beginn ergibt 400', async () => {
    const [a] = await get('/api/ausfall');
    const r = await app.inject({ method: 'PATCH', url: `/api/ausfall/${a.id}`, payload: { bis: '2026-09-01T00:00:00.000Z' } });
    expect(r.statusCode).toBe(400);
  });

  test('Selbstbuchung ohne Entscheidung: offener Fall wird selbst_gebucht, kein Anruf nötig, Original storniert', async () => {
    const f = await fallVon('Cem Oeztuerk');
    const r = await post('/api/sim/selbstbuchung', { appointmentId: f.appointment.id });
    expect(r.statusCode).toBe(200);
    const danach = await fallVon('Cem Oeztuerk');
    expect(danach.status).toBe('selbst_gebucht');
    expect((await pool.query(`select status from termino.appointment where id=$1`, [f.appointment.id])).rows[0].status).toBe('cancelled');
    expect((await pool.query(`select count(*)::int n from termino.appointment where source='patient'`)).rows[0].n).toBe(1);
  });

  test('Selbstbuchung nach Absage mit Link: Fall wechselt von abgesagt zu selbst_gebucht', async () => {
    const f = await fallVon('Gisela Neumann');
    await post(`/api/faelle/${f.appointment.id}/absagen`, { art: 'mit_link' });
    expect((await fallVon('Gisela Neumann')).status).toBe('abgesagt');
    expect((await post('/api/sim/selbstbuchung', { appointmentId: f.appointment.id })).statusCode).toBe(200);
    expect((await fallVon('Gisela Neumann')).status).toBe('selbst_gebucht');
  });

  test('Diagnosegruppen: die API liefert Bezeichnung und Quelle je Kürzel', async () => {
    const g = await get('/api/diagnosegruppen');
    expect(g.WS2).toMatchObject({ kurz: 'Wirbelsäule' });
    expect(g.EX3.quellen.length).toBeGreaterThan(0);
  });
});
