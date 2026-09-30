import { findeFaelle, reichereAn } from './enrich.js';
import { bewerte } from './priority.js';
import { freieSlots } from './slots.js';
import type { AutopilotInput, Fall, Slot, Stufe } from './types.js';

const STUFEN: Stufe[] = ['frist', 'hoch', 'normal', 'pruefen'];
const ANRUF_FENSTER_MIN = 60;

const nachPrioritaet = (a: Fall, b: Fall) =>
  STUFEN.indexOf(a.stufe) - STUFEN.indexOf(b.stufe) || b.score - a.score || a.appointment.startsAt.localeCompare(b.appointment.startsAt);

/** Berechnet für jeden betroffenen Termin Stufe, Empfehlung und (konfliktfrei verteilte) Slot-Vorschläge. */
export function runAutopilot(input: AutopilotInput): Fall[] {
  const faelle: Fall[] = findeFaelle(input).map((a) => {
    const f = reichereAn(a, input);
    return { ...f, ...bewerte(f, input.absageTage), vorschlag: null, alternativen: [], anrufRang: 0 };
  });

  const reserviert: Slot[] = [];
  for (const f of faelle.filter((x) => x.status === 'offen' && x.empfehlung === 'umbuchen').sort(nachPrioritaet)) {
    const slots = freieSlots(f, input, reserviert);
    f.vorschlag = slots[0] ?? null;
    f.alternativen = slots.slice(1, 3);
    if (f.vorschlag) reserviert.push(f.vorschlag);
    if (!f.vorschlag) f.empfehlung = f.stufe === 'frist' ? 'eskalieren' : 'absagen_mit_link';
    else if (f.stufe === 'normal' && f.vorschlag.rang === 4) f.empfehlung = 'absagen_mit_link';
  }

  const offen = faelle.filter((f) => f.status === 'offen');
  const dringend = offen.filter((f) => f.minutenBisStart < ANRUF_FENSTER_MIN).sort((a, b) => a.appointment.startsAt.localeCompare(b.appointment.startsAt));
  const uebrige = offen.filter((f) => f.minutenBisStart >= ANRUF_FENSTER_MIN).sort(nachPrioritaet);
  const erledigt = faelle.filter((f) => f.status !== 'offen').sort((a, b) => a.appointment.startsAt.localeCompare(b.appointment.startsAt));
  return [...dringend, ...uebrige, ...erledigt].map((f, i) => ({ ...f, anrufRang: i }));
}

/** Alle freien Slots für einen Fall. Slots, die als Vorschlag für eine andere Patient:in reserviert sind, sind markiert. */
export function slotsFuerFall(appointmentId: string, input: AutopilotInput): (Slot & { reserviertFuer: string | null })[] {
  const faelle = runAutopilot(input);
  const fall = faelle.find((f) => f.appointment.id === appointmentId);
  if (!fall) return [];
  const fremd = new Map<string, string>();
  for (const f of faelle) if (f !== fall && f.vorschlag) fremd.set(f.vorschlag.practitionerId + f.vorschlag.startsAt, f.appointment.patient.name);
  return freieSlots(fall, input, []).map((s) => ({ ...s, reserviertFuer: fremd.get(s.practitionerId + s.startsAt) ?? null }));
}
