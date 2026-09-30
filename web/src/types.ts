// Bewusst aus api/src/domain/types.ts dupliziert (kein Shared-Package in der Timebox).
export interface TerminoPatient { id: string; name: string; birth_date: string; phone: string | null; email: string | null }
export interface Appointment {
  id: string; locationId: string; practitionerId: string; service: string; startsAt: string; durationMin: number;
  status: 'booked' | 'cancelled'; patient: TerminoPatient; bookedAt: string; updatedAt: string; source: 'export' | 'api' | 'patient';
}
export interface Patient { id: string; vorname: string; nachname: string; geburtsdatum: string; telefon: string | null; email: string | null; terminoPatientId: string | null }
export interface Verordnung { id: string; patientId: string; ausstellungsdatum: string; diagnosegruppe: string; heilmittel: string; verordnungsmenge: number; frequenzProWoche: number }
export type Stufe = 'frist' | 'hoch' | 'normal' | 'pruefen';
export type Empfehlung = 'umbuchen' | 'ersatzlos_absagen' | 'doppelbuchung_stornieren' | 'absagen_mit_link' | 'eskalieren';
export type WarnCode = 'doppelbuchung' | 'identitaet_pruefen' | 'stammdaten_fehlen' | 'nicht_anrufbar' | 'nicht_erreichbar';
export interface Warnung { code: WarnCode; text: string }
export interface Slot {
  practitionerId: string; therapeutName: string; praxisId: string; praxisName: string; locationId: string;
  startsAt: string; endsAt: string; rang: 1 | 2 | 3 | 4; gleicheUhrzeit: boolean;
}
export type SlotMitReservierung = Slot & { reserviertFuer: string | null };
export type FallStatus = 'offen' | 'umgebucht' | 'abgesagt' | 'selbst_gebucht';
export interface Fall {
  appointment: Appointment; patient: Patient | null; match: 'exakt' | 'unsicher' | 'fehlt'; verordnung: Verordnung | null; heilmittel: string;
  frist: string | null; fristGrund: 'beginn' | 'unterbrechung' | null; letzteBehandlung: string | null; naechsterTermin: Appointment | null;
  stufe: Stufe; score: number; gruende: string[]; warnungen: Warnung[]; empfehlung: Empfehlung;
  vorschlag: Slot | null; alternativen: Slot[]; status: FallStatus; minutenBisStart: number; anrufRang: number; spaetereDoppelbuchung: boolean;
}
export interface AusfallInfo { id: string; therapeutName: string; von: string; bis: string }
export interface FaelleAntwort { ausfall: AusfallInfo; jetzt: string; exportStand: '0800' | '0805' | null; faelle: Fall[] }
export interface OutboxEintrag { id: number; appointmentId: string; kanal: 'sms' | 'email'; empfaenger: string; betreff: string | null; text: string; createdAt: string }
export interface Diagnosegruppe {
  code: string; kurz: string; bezeichnung: string; ziffer_hinweis: string | null; quellen: string[];
  verifikation: { gruppe: string; ziffer: string }; hinweis: string;
}
