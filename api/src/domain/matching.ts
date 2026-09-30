import type { MatchArt, Patient, TerminoPatient } from './types.js';

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function matchPatient(tp: TerminoPatient, patienten: Patient[]): { art: MatchArt; patient: Patient | null } {
  const exakt = patienten.find((p) => p.terminoPatientId === tp.id);
  if (exakt) return { art: 'exakt', patient: exakt };
  const nachname = tp.name.trim().split(/\s+/).at(-1)!.toLowerCase();
  const kandidat = patienten.find((p) =>
    p.terminoPatientId === null && p.geburtsdatum === tp.birth_date &&
    ((tp.phone !== null && p.telefon === tp.phone) || (tp.email !== null && p.email === tp.email) ||
      levenshtein(p.nachname.toLowerCase(), nachname) <= 2));
  return kandidat ? { art: 'unsicher', patient: kandidat } : { art: 'fehlt', patient: null };
}
