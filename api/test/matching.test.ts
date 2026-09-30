import { describe, expect, test } from 'vitest';
import { matchPatient } from '../src/domain/matching.js';
import { loadFixtureInput } from './fixtures.js';

const input = loadFixtureInput();
const tp = (id: string) => input.appointments.find((a) => a.patient.id === id)!.patient;

describe('matchPatient', () => {
  test('Sabine Czerny: exakt über termino_patient_id', () => {
    expect(matchPatient(tp('pat_02026'), input.patienten).art).toBe('exakt');
  });
  test('Katrin Meier (Termino) ↔ Katrin Meyer (Stammdaten): unsicher', () => {
    const r = matchPatient(tp('pat_02538'), input.patienten);
    expect(r.art).toBe('unsicher');
    expect(r.patient?.nachname).toBe('Meyer');
  });
  test('Lena Krause: fehlt', () => {
    expect(matchPatient(tp('pat_03115'), input.patienten)).toEqual({ art: 'fehlt', patient: null });
  });
  test('nach dem Zusammenführen ist der Treffer exakt', () => {
    const patienten = input.patienten.map((p) => p.nachname === 'Meyer' && p.vorname === 'Katrin' ? { ...p, terminoPatientId: 'pat_02538' } : p);
    expect(matchPatient(tp('pat_02538'), patienten).art).toBe('exakt');
  });
});
