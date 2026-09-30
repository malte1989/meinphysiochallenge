import { describe, expect, test } from 'vitest';
import { runAutopilot, slotsFuerFall } from '../src/domain/autopilot.js';
import { berlinDate, berlinTime } from '../src/domain/time.js';
import { loadFixtureInput } from './fixtures.js';

const name = (f: { appointment: { patient: { name: string } } }) => f.appointment.patient.name;

describe('runAutopilot', () => {
  const input = loadFixtureInput('0800');
  const faelle = runAutopilot(input);

  test('14 Fälle', () => {
    expect(faelle).toHaveLength(14);
  });

  test('kein Slot wird doppelt vergeben', () => {
    const keys = faelle.flatMap((f) => (f.vorschlag ? [f.vorschlag.practitionerId + f.vorschlag.startsAt] : []));
    expect(keys.length).toBeGreaterThan(5);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('Frist-Fälle werden vor ihrer Frist bedient oder eskaliert', () => {
    const fristFaelle = faelle.filter((f) => f.stufe === 'frist');
    expect(fristFaelle.map(name).sort()).toEqual(['Cem Oeztuerk', 'Renate Vogel']);
    for (const f of fristFaelle)
      expect(f.vorschlag ? berlinDate(f.vorschlag.startsAt) <= f.frist! : f.empfehlung === 'eskalieren').toBe(true);
  });

  test('ersatzlos und Doppelbuchung verbrauchen keinen Slot', () => {
    const ohne = faelle.filter((f) => ['ersatzlos_absagen', 'doppelbuchung_stornieren'].includes(f.empfehlung));
    expect(ohne.map(name).sort()).toEqual(['Jan Ahrens', 'Marek Kowalski']);
    expect(ohne.every((f) => f.vorschlag === null)).toBe(true);
  });

  test('Anrufreihenfolge: Sabine Czerny (08:00) und Lena Krause (08:20) zuerst', () => {
    expect(faelle.slice(0, 2).map(name)).toEqual(['Sabine Czerny', 'Lena Krause']);
    expect(faelle.map((f) => f.anrufRang)).toEqual(faelle.map((_, i) => i));
  });


  test('Nachmittagstermin wird nicht auf den Morgen vorgezogen: Renate (15:40) bekommt einen Slot nach 14:00', () => {
    const renate = faelle.find((f) => name(f) === 'Renate Vogel')!;
    expect(renate.vorschlag).not.toBeNull();
    expect(berlinTime(renate.vorschlag!.startsAt) >= '14:00').toBe(true);
  });

  test('ohne Vorschlag wird aus umbuchen absagen_mit_link oder bei Frist eskalieren', () => {
    const brigitte = faelle.find((f) => name(f) === 'Brigitte Hoffmann')!;
    expect(brigitte.vorschlag).toBeNull();
    expect(brigitte.empfehlung).toBe('absagen_mit_link');
  });

  test('erledigte Fälle reservieren nichts und stehen hinten', () => {
    const inp = loadFixtureInput('0800');
    const cem = runAutopilot(inp).find((f) => name(f) === 'Cem Oeztuerk')!;
    inp.entscheidungen.push({ appointmentId: cem.appointment.id, aktion: 'abgesagt_mit_link', neuerTerminId: null, createdAt: inp.jetzt });
    const r = runAutopilot(inp);
    const c = r.find((f) => f.appointment.id === cem.appointment.id)!;
    expect(c.status).toBe('abgesagt');
    expect(c.vorschlag).toBeNull();
    expect(r.at(-1)!.status).not.toBe('offen');
  });
});

describe('slotsFuerFall', () => {
  test('liefert Slots und markiert fremde Reservierungen', () => {
    const input = loadFixtureInput('0800');
    const faelle = runAutopilot(input);
    const kerstin = faelle.find((f) => name(f) === 'Kerstin Nowak')!;
    const andere = faelle.find((f) => f.vorschlag && f !== kerstin)!;
    const slots = slotsFuerFall(kerstin.appointment.id, input);
    expect(slots.length).toBeGreaterThan(0);
    const fremd = slots.find((s) => s.practitionerId === andere.vorschlag!.practitionerId && s.startsAt === andere.vorschlag!.startsAt);
    if (fremd) expect(fremd.reserviertFuer).toBe(name(andere));
    expect(slots.filter((s) => s.reserviertFuer === name(kerstin))).toEqual([]);
  });
});
