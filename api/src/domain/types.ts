import type { Appointment, TerminoPatient } from '../termino/client.js';
export type { Appointment, TerminoPatient };

export type Heilmittel = 'KG' | 'MT' | 'MLD45' | 'KGG';
export interface Praxis { id: string; name: string; terminoLocationId: string }
export interface Therapeut { id: string; vorname: string; nachname: string; qualifikationen: Heilmittel[]; terminoPractitionerId: string }
export interface Arbeitszeit { therapeutId: string; wochentag: 1 | 2 | 3 | 4 | 5; praxisId: string; von: string; bis: string } // 'HH:MM' Berlin
export interface Patient { id: string; vorname: string; nachname: string; geburtsdatum: string; telefon: string | null; email: string | null; terminoPatientId: string | null }
export interface Verordnung { id: string; patientId: string; ausstellungsdatum: string; diagnosegruppe: string; heilmittel: Heilmittel; verordnungsmenge: number; frequenzProWoche: number }
export interface Ausfall { id: string; therapeutId: string; von: string; bis: string; createdAt: string }
export type Aktion = 'umgebucht' | 'abgesagt_mit_link' | 'ersatzlos_abgesagt' | 'doppelbuchung_storniert';
export interface Entscheidung { appointmentId: string; aktion: Aktion; neuerTerminId: string | null; createdAt: string }
export interface AutopilotInput {
  jetzt: string; ausfall: Ausfall; appointments: Appointment[]; patienten: Patient[]; verordnungen: Verordnung[];
  therapeuten: Therapeut[]; arbeitszeiten: Arbeitszeit[]; praxen: Praxis[]; entscheidungen: Entscheidung[];
  exportFensterBis: string; absageTage: number;
}
export type MatchArt = 'exakt' | 'unsicher' | 'fehlt';
export type Stufe = 'frist' | 'hoch' | 'normal' | 'pruefen';
export type Empfehlung = 'umbuchen' | 'ersatzlos_absagen' | 'doppelbuchung_stornieren' | 'absagen_mit_link' | 'eskalieren';
export type WarnCode = 'doppelbuchung' | 'identitaet_pruefen' | 'stammdaten_fehlen' | 'nicht_anrufbar' | 'nicht_erreichbar';
export interface Warnung { code: WarnCode; text: string }
export interface Slot {
  practitionerId: string; therapeutName: string; praxisId: string; praxisName: string; locationId: string;
  startsAt: string; endsAt: string; rang: 1 | 2 | 3 | 4; gleicheUhrzeit: boolean;
}
export type FallStatus = 'offen' | 'umgebucht' | 'abgesagt' | 'selbst_gebucht';
export interface Fall {
  appointment: Appointment; patient: Patient | null; match: MatchArt; verordnung: Verordnung | null; heilmittel: Heilmittel;
  frist: string | null; fristGrund: 'beginn' | 'unterbrechung' | null; letzteBehandlung: string | null; naechsterTermin: Appointment | null;
  stufe: Stufe; score: number; gruende: string[]; warnungen: Warnung[]; empfehlung: Empfehlung;
  vorschlag: Slot | null; alternativen: Slot[]; status: FallStatus; minutenBisStart: number; anrufRang: number;
}
