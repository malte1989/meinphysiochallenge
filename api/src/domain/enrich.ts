import { matchPatient } from './matching.js';
import { serviceToHeilmittel } from './heilmittel.js';
import { addDays, berlinDate, berlinTime } from './time.js';
import type { Appointment, AutopilotInput, Fall, FallStatus, Warnung } from './types.js';

export type AngereichertFall = Omit<Fall, 'stufe' | 'score' | 'gruende' | 'empfehlung' | 'vorschlag' | 'alternativen' | 'anrufRang'>;

/** Termine der ausgefallenen Person im Ausfallzeitraum: gebuchte sowie nach Anlage des Ausfalls stornierte. */
export function findeFaelle(input: AutopilotInput): Appointment[] {
  const t = input.therapeuten.find((x) => x.id === input.ausfall.therapeutId);
  if (!t) return [];
  const { von, bis, createdAt } = input.ausfall;
  return input.appointments
    .filter((a) => a.practitionerId === t.terminoPractitionerId && a.startsAt >= von && a.startsAt < bis)
    .filter((a) => a.status === 'booked' || a.updatedAt >= createdAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function reichereAn(a: Appointment, input: AutopilotInput): AngereichertFall {
  const faelle = findeFaelle(input);
  const fallIds = new Set(faelle.map((f) => f.id));
  const { art, patient } = matchPatient(a.patient, input.patienten);
  const verordnung = patient ? input.verordnungen.find((v) => v.patientId === patient.id) ?? null : null;
  const eigene = input.appointments.filter((x) => x.patient.id === a.patient.id && x.status === 'booked' && x.id !== a.id);

  const behandlungen = eigene.filter((x) => x.startsAt < a.startsAt).sort((x, y) => y.startsAt.localeCompare(x.startsAt));
  const letzteBehandlung = behandlungen[0] ? berlinDate(behandlungen[0].startsAt) : null;
  let frist: string | null = null;
  let fristGrund: Fall['fristGrund'] = null;
  if (verordnung) {
    if (letzteBehandlung) { frist = addDays(letzteBehandlung, 14); fristGrund = 'unterbrechung'; }
    else { frist = addDays(verordnung.ausstellungsdatum, 28); fristGrund = 'beginn'; }
  }

  const tag = berlinDate(a.startsAt);
  const naechsterTermin = eigene
    .filter((x) => x.startsAt > a.startsAt && !fallIds.has(x.id))
    .sort((x, y) => x.startsAt.localeCompare(y.startsAt))[0] ?? null;
  const gleicherTag = faelle.filter((f) => f.id !== a.id && f.status === 'booked' && f.patient.id === a.patient.id && berlinDate(f.startsAt) === tag);
  const spaetereDoppelbuchung = gleicherTag.some((f) => f.startsAt < a.startsAt);

  const warnungen: Warnung[] = [];
  if (gleicherTag.length > 0) warnungen.push({ code: 'doppelbuchung', text: `Doppelbuchung? Weiterer Termin am selben Tag um ${berlinTime(gleicherTag[0].startsAt)} Uhr` });
  if (art === 'unsicher') warnungen.push({ code: 'identitaet_pruefen', text: 'Identität prüfen: Termino-Patient:in passt nur ungefähr zu den Stammdaten' });
  if (art === 'fehlt') warnungen.push({ code: 'stammdaten_fehlen', text: 'Stammdaten fehlen: Patient:in nicht in der Verwaltung, keine Verordnung bekannt' });
  const telefon = patient?.telefon ?? a.patient.phone;
  const email = patient?.email ?? a.patient.email;
  if (!telefon && email) warnungen.push({ code: 'nicht_anrufbar', text: 'Keine Telefonnummer, nur E-Mail' });
  if (!telefon && !email) warnungen.push({ code: 'nicht_erreichbar', text: 'Weder Telefon noch E-Mail bekannt' });

  const entscheidung = input.entscheidungen.find((e) => e.appointmentId === a.id);
  const selbstGebucht = eigene.some((x) => x.source !== 'api' && x.bookedAt >= input.ausfall.createdAt && !fallIds.has(x.id));
  let status: FallStatus = 'offen';
  if (entscheidung) {
    if (entscheidung.aktion === 'umgebucht') status = 'umgebucht';
    else status = entscheidung.aktion === 'abgesagt_mit_link' && selbstGebucht ? 'selbst_gebucht' : 'abgesagt';
  }
  else if (selbstGebucht) status = 'selbst_gebucht';
  else if (a.status === 'cancelled') status = 'abgesagt';

  return {
    appointment: a, patient, match: art, verordnung, heilmittel: serviceToHeilmittel(a.service),
    frist, fristGrund, letzteBehandlung, naechsterTermin, warnungen, status, spaetereDoppelbuchung,
    minutenBisStart: Math.round((Date.parse(a.startsAt) - Date.parse(input.jetzt)) / 60_000),
  };
}
