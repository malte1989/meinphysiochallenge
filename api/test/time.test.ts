import { describe, expect, test } from 'vitest';
import { addDays, berlinDate, berlinTime, berlinWallToUtc, berlinWeekday, daysBetween } from '../src/domain/time.js';

describe('time', () => {
  test('Berliner Wandzeit → UTC (Sommerzeit)', () => {
    expect(berlinWallToUtc('2026-09-07', '08:00')).toBe('2026-09-07T06:00:00.000Z');
  });
  test('Berliner Wandzeit → UTC (Winterzeit)', () => {
    expect(berlinWallToUtc('2026-12-07', '08:00')).toBe('2026-12-07T07:00:00.000Z');
  });
  test('UTC-Abend zählt zum nächsten Berliner Tag', () => {
    expect(berlinDate('2026-09-06T22:30:00Z')).toBe('2026-09-07');
  });
  test('berlinTime', () => {
    expect(berlinTime('2026-09-07T06:00:00Z')).toBe('08:00');
  });
  test('addDays und daysBetween', () => {
    expect(addDays('2026-08-12', 28)).toBe('2026-09-09');
    expect(daysBetween('2026-09-07', '2026-09-09')).toBe(2);
  });
  test('Wochentag: 07.09.2026 ist Montag', () => {
    expect(berlinWeekday('2026-09-07')).toBe(1);
  });
});
