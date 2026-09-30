import { describe, expect, test } from 'vitest';
import { findeFaelle, reichereAn } from '../src/domain/enrich.js';
import { bewerte } from '../src/domain/priority.js';
import { loadFixtureInput } from './fixtures.js';

const input = loadFixtureInput();
const alle = findeFaelle(input);
const faelleFuer = (name: string) => alle.filter((a) => a.patient.name === name).map((a) => reichereAn(a, input));
const fallFuer = (name: string) => faelleFuer(name)[0];

describe('findeFaelle', () => {
  test('14 gebuchte Termine von Anna am 07.09. (plus der bereits stornierte)', () => {
    expect(alle.filter((a) => a.status === 'booked')).toHaveLength(14);
  });
});

describe('Fristen', () => {
  test('Cem: Behandlungsbeginn-Frist 09.09.', () => {
    expect(fallFuer('Cem Oeztuerk')).toMatchObject({ frist: '2026-09-09', fristGrund: 'beginn' });
  });
  test('Renate: Unterbrechungsfrist 09.09., letzte Behandlung 26.08.', () => {
    expect(fallFuer('Renate Vogel')).toMatchObject({ frist: '2026-09-09', fristGrund: 'unterbrechung', letzteBehandlung: '2026-08-26' });
  });
});

describe('Stufe und Empfehlung', () => {
  test('Cem: Stufe frist, niemals ersatzlos absagen', () => {
    expect(bewerte(fallFuer('Cem Oeztuerk'))).toMatchObject({ stufe: 'frist', empfehlung: 'umbuchen' });
  });
  test('Renate: Stufe frist', () => {
    expect(bewerte(fallFuer('Renate Vogel')).stufe).toBe('frist');
  });
  test('Jan: nächster Termin Mi 09.09. → ersatzlos absagen', () => {
    expect(bewerte(fallFuer('Jan Ahrens')).empfehlung).toBe('ersatzlos_absagen');
  });
  test('Marek: Doppelbuchung, der spätere Termin wird zur Stornierung empfohlen', () => {
    const [m1, m2] = faelleFuer('Marek Kowalski');
    expect(m1.warnungen.map((w) => w.code)).toContain('doppelbuchung');
    expect(bewerte(m2)).toMatchObject({ stufe: 'pruefen', empfehlung: 'doppelbuchung_stornieren' });
    expect(bewerte(m1).empfehlung).toBe('umbuchen');
  });
  test('Katrin Meier: unsicherer Treffer mit Verordnung EX3', () => {
    expect(fallFuer('Katrin Meier')).toMatchObject({ match: 'unsicher', verordnung: { diagnosegruppe: 'EX3' } });
    expect(fallFuer('Katrin Meier').warnungen.map((w) => w.code)).toContain('identitaet_pruefen');
  });
  test('Lena Krause: Stammdaten fehlen → Stufe pruefen', () => {
    expect(bewerte(fallFuer('Lena Krause')).stufe).toBe('pruefen');
    expect(fallFuer('Lena Krause').warnungen.map((w) => w.code)).toContain('stammdaten_fehlen');
  });
  test('Gisela Neumann: keine Telefonnummer → nicht anrufbar', () => {
    expect(fallFuer('Gisela Neumann').warnungen.map((w) => w.code)).toContain('nicht_anrufbar');
  });
  test('Sabine Czerny: 08:00 Berlin ist 20 Minuten nach jetzt', () => {
    expect(fallFuer('Sabine Czerny').minutenBisStart).toBe(20);
  });
  test('Doppelbuchungs-Partner zählt nicht als nächster Termin', () => {
    const [m1] = faelleFuer('Marek Kowalski');
    expect(m1.naechsterTermin).toBeNull();
  });
});

describe('selbst gebucht', () => {
  test('nach „Absagen mit Link“ gilt der Fall als selbst gebucht, sobald die Patient:in neu gebucht hat', () => {
    const inp = loadFixtureInput();
    const cem = findeFaelle(inp).find((a) => a.patient.name === 'Cem Oeztuerk')!;
    inp.entscheidungen.push({ appointmentId: cem.id, aktion: 'abgesagt_mit_link', neuerTerminId: null, createdAt: inp.jetzt });
    expect(reichereAn(cem, inp).status).toBe('abgesagt');
    inp.appointments.push({ ...cem, id: 'apt_selbst', startsAt: '2026-09-08T08:00:00Z', source: 'patient', bookedAt: '2026-09-07T05:50:00Z', updatedAt: '2026-09-07T05:50:00Z' });
    expect(reichereAn(cem, inp).status).toBe('selbst_gebucht');
  });
});
