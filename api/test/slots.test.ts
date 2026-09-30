import { describe, expect, test } from 'vitest';
import { findeFaelle, reichereAn } from '../src/domain/enrich.js';
import { freieSlots } from '../src/domain/slots.js';
import { berlinDate } from '../src/domain/time.js';
import { loadFixtureInput } from './fixtures.js';

const input = loadFixtureInput('0800');
const fall = (name: string, inp = input) => reichereAn(findeFaelle(inp).find((a) => a.patient.name === name)!, inp);
const slots = (name: string, inp = input) => freieSlots(fall(name, inp), inp, []);

describe('freieSlots', () => {
  test('Kerstin Nowak: bester Slot hat gleiche Uhrzeit und gleiche Praxis (Jonas 09:20)', () => {
    expect(slots('Kerstin Nowak')[0]).toMatchObject({ rang: 1, gleicheUhrzeit: true, startsAt: '2026-09-07T07:20:00.000Z', practitionerId: 'prac_02' });
  });
  test('Brigitte Hoffmann (MLD45, 40 Min.): im ganzen Fenster kein Ersatz, da Meltems einzige freie 40-Minuten-Lücke auf Brigittes eigenen Termin-Tag fällt', () => {
    expect(slots('Brigitte Hoffmann')).toEqual([]);
  });
  test('MLD45 geht nur bei Meltem oder Anna: andere Patient:in bekommt Meltems freie Lücke Do 10.09. 14:00', () => {
    const f = fall('Brigitte Hoffmann');
    const andere = { ...f, appointment: { ...f.appointment, patient: { ...f.appointment.patient, id: 'pat_fremd' } } };
    const s = freieSlots(andere, input, []);
    expect(s.map((x) => [x.practitionerId, x.startsAt])).toEqual([['prac_05', '2026-09-10T12:00:00.000Z']]);
  });
  test('Frank Krüger (MT): nie bei Sofia, David oder Tobias', () => {
    const s = slots('Frank Krueger');
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => !['prac_04', 'prac_06', 'prac_08'].includes(x.practitionerId))).toBe(true);
  });
  test('Cem: nicht nach seiner Frist (09.09.)', () => {
    const s = slots('Cem Oeztuerk');
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => berlinDate(x.startsAt) <= '2026-09-09')).toBe(true);
  });
  test('Vorlauf: kein Slot früher als jetzt + 20 Minuten', () => {
    expect(slots('Sabine Czerny').every((x) => x.startsAt >= '2026-09-07T06:00:00.000Z')).toBe(true);
  });
  test('Jan hat Mi 09.09. schon einen Termin: dieser Tag entfällt', () => {
    expect(slots('Jan Ahrens').some((x) => berlinDate(x.startsAt) === '2026-09-09')).toBe(false);
  });
  test('die ausgefallene Anna bietet am Ausfalltag keine Slots an', () => {
    expect(slots('Cem Oeztuerk').some((x) => x.practitionerId === 'prac_01' && berlinDate(x.startsAt) === '2026-09-07')).toBe(false);
  });
  test('reservierte Slots werden nicht nochmals angeboten', () => {
    const erster = slots('Kerstin Nowak')[0];
    const danach = freieSlots(fall('Kerstin Nowak'), input, [erster]);
    expect(danach.some((x) => x.practitionerId === erster.practitionerId && x.startsAt === erster.startsAt)).toBe(false);
  });
  test('Export 08:05: Mi 09.09. 09:20 bei Sofia wird für Cem frei', () => {
    const i5 = loadFixtureInput('0805');
    const vorher = slots('Cem Oeztuerk');
    const nachher = slots('Cem Oeztuerk', i5);
    const hat = (s: typeof vorher) => s.some((x) => x.practitionerId === 'prac_04' && x.startsAt === '2026-09-09T07:20:00.000Z');
    expect(hat(vorher)).toBe(false);
    expect(hat(nachher)).toBe(true);
  });
});
