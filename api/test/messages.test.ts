import { describe, expect, test } from 'vitest';
import { nachrichten } from '../src/outbox/messages.js';
import type { Appointment } from '../src/domain/types.js';

const patient = { id: 'pat_02026', name: 'Sabine Czerny', birth_date: '1953-09-20', phone: '+49 151 55011007', email: 'sabine.czerny@example.com' };
const alt: Appointment = {
  id: 'apt_1', locationId: 'loc_01', practitionerId: 'prac_01', service: 'Krankengymnastik', startsAt: '2026-09-07T06:00:00Z',
  durationMin: 20, status: 'booked', patient, bookedAt: '2026-09-04T10:00:00Z', updatedAt: '2026-09-04T10:00:00Z', source: 'export',
};
const neu = { startsAt: '2026-09-09T07:20:00Z', praxisName: 'meinphysio+ Mitte', therapeutName: 'Sofia Lindqvist' };
const beide = { telefon: '+49 151 55011007', email: 'sabine.czerny@example.com' };
const ctx = { patient, kontakt: beide, alt };

describe('nachrichten', () => {
  test('ohne Telefonnummer nur E-Mail (Gisela Neumann)', () => {
    const m = nachrichten('abgesagt_mit_link', { ...ctx, kontakt: { telefon: null, email: 'gisela.neumann@example.com' } });
    expect(m.map((x) => x.kanal)).toEqual(['email']);
  });
  test('Absage enthält den Link zur Selbstbuchung mit der Termino-ID', () => {
    const m = nachrichten('abgesagt_mit_link', ctx);
    expect(m.map((x) => x.kanal)).toEqual(['sms', 'email']);
    expect(m[0].text).toContain('https://termino.example/buchen?patient=pat_02026');
  });
  test('Verschiebung nennt neuen Termin in Berliner Zeit', () => {
    const m = nachrichten('verschoben', { ...ctx, neu });
    expect(m[0].text).toContain('09.09.');
    expect(m[0].text).toContain('09:20');
    expect(m[0].text).toContain('Sofia Lindqvist');
  });
  test('alter Termin wird in Berliner Zeit genannt, nicht in UTC', () => {
    expect(nachrichten('verschoben', { ...ctx, neu })[0].text).toContain('08:00');
  });
  test('ohne Telefon und E-Mail keine Nachricht', () => {
    expect(nachrichten('verschoben', { ...ctx, kontakt: { telefon: null, email: null }, neu })).toEqual([]);
  });
  test('ersatzlose Absage enthält keinen Link, Doppelbuchung nennt den behaltenen Termin nicht als neu', () => {
    expect(nachrichten('ersatzlos_abgesagt', ctx)[0].text).not.toContain('termino.example');
    expect(nachrichten('doppelbuchung_storniert', ctx)[0].text).toContain('doppelt');
  });
});
