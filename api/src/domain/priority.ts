import { addDays, berlinDate, daysBetween } from './time.js';
import type { Empfehlung, Fall, Stufe } from './types.js';

type Bewertbar = Omit<Fall, 'stufe' | 'score' | 'gruende' | 'empfehlung' | 'vorschlag' | 'alternativen' | 'anrufRang'>;

const HOCH_DIAGNOSEN = ['EX3', 'LY2'];
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const datumKurz = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
const wochentagKurz = (iso: string) => `${WOCHENTAGE[new Date(`${berlinDate(iso)}T12:00:00Z`).getUTCDay()]} ${datumKurz(berlinDate(iso))}`;

export function bewerte(f: Bewertbar, absageTage = 2): { stufe: Stufe; score: number; gruende: string[]; empfehlung: Empfehlung } {
  const jetzt = new Date(Date.parse(f.appointment.startsAt) - f.minutenBisStart * 60_000).toISOString();
  const heute = berlinDate(jetzt);
  const fallTag = berlinDate(f.appointment.startsAt);
  const freq = f.verordnung?.frequenzProWoche ?? 0;
  const diagnose = f.verordnung?.diagnosegruppe;

  let stufe: Stufe;
  if (f.spaetereDoppelbuchung || f.match === 'fehlt') stufe = 'pruefen';
  else if (f.frist && f.frist <= addDays(heute, 3)) stufe = 'frist';
  else if (freq === 2 || (diagnose && HOCH_DIAGNOSEN.includes(diagnose))) stufe = 'hoch';
  else stufe = 'normal';

  const fristPunkte = f.frist ? Math.max(0, 40 - 4 * daysBetween(heute, f.frist)) : 0;
  const pausePunkte = f.letzteBehandlung ? Math.min(30, 2 * daysBetween(f.letzteBehandlung, heute)) : 0;
  const score = Math.max(0, Math.min(100, fristPunkte + 15 * freq + pausePunkte));

  const gruende: string[] = [];
  if (f.frist) gruende.push(`Frist ${datumKurz(f.frist)} (${f.fristGrund === 'beginn' ? 'Behandlungsbeginn' : 'Unterbrechung'})`);
  if (freq) gruende.push(`${freq}×/Woche`);
  if (diagnose && HOCH_DIAGNOSEN.includes(diagnose)) gruende.push(`${diagnose} (Tie-Breaker)`);
  if (f.naechsterTermin) gruende.push(`nächster Termin ${wochentagKurz(f.naechsterTermin.startsAt)}`);

  let empfehlung: Empfehlung = 'umbuchen';
  if (f.spaetereDoppelbuchung) empfehlung = 'doppelbuchung_stornieren';
  else if (f.naechsterTermin) {
    const nTag = berlinDate(f.naechsterTermin.startsAt);
    if (daysBetween(fallTag, nTag) <= absageTage && (f.frist === null || nTag <= f.frist)) empfehlung = 'ersatzlos_absagen';
  }
  return { stufe, score, gruende, empfehlung };
}
