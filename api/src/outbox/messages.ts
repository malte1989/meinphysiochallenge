import type { Appointment, TerminoPatient } from '../domain/types.js';
import { berlinTime, wochentagKurz } from '../domain/time.js';

export type NachrichtArt = 'verschoben' | 'abgesagt_mit_link' | 'ersatzlos_abgesagt' | 'doppelbuchung_storniert';
export interface NachrichtCtx {
  patient: TerminoPatient;
  kontakt: { telefon: string | null; email: string | null };
  alt: Appointment;
  neu?: { startsAt: string; praxisName: string; therapeutName: string };
}
export interface Nachricht { kanal: 'sms' | 'email'; empfaenger: string; betreff: string | null; text: string }

const zeit = (iso: string) => `${wochentagKurz(iso)} um ${berlinTime(iso)} Uhr`;

/** Erzeugt SMS (nur mit Telefonnummer) und E-Mail (nur mit Adresse) für eine Entscheidung. Der Versand ist simuliert. */
export function nachrichten(art: NachrichtArt, ctx: NachrichtCtx): Nachricht[] {
  const vorname = ctx.patient.name.split(' ')[0];
  const alt = zeit(ctx.alt.startsAt);
  const link = `https://termino.example/buchen?patient=${ctx.patient.id}`;
  const gruss = `Guten Tag ${vorname}, `;
  const signatur = ' Ihr Team von meinphysio+';
  const inhalt: Record<NachrichtArt, { betreff: string; text: string }> = {
    verschoben: {
      betreff: 'Ihr Termin bei meinphysio+ wurde verschoben',
      text: `${gruss}leider müssen wir Ihren Termin am ${alt} verschieben. Ihr neuer Termin: ${ctx.neu ? `${zeit(ctx.neu.startsAt)} bei ${ctx.neu.therapeutName} (${ctx.neu.praxisName})` : 'folgt'}.${signatur}`,
    },
    abgesagt_mit_link: {
      betreff: 'Bitte buchen Sie einen Ersatztermin bei meinphysio+',
      text: `${gruss}leider müssen wir Ihren Termin am ${alt} absagen. Bitte buchen Sie hier einen Ersatztermin, gern auch in einer anderen Praxis: ${link}${signatur}`,
    },
    ersatzlos_abgesagt: {
      betreff: 'Ihr Termin bei meinphysio+ entfällt',
      text: `${gruss}Ihr Termin am ${alt} entfällt. Ihr nächster Termin bleibt wie gebucht.${signatur}`,
    },
    doppelbuchung_storniert: {
      betreff: 'Doppelter Termin bei meinphysio+ storniert',
      text: `${gruss}Sie hatten am selben Tag doppelt gebucht. Wir haben den Termin am ${alt} storniert, Ihr anderer Termin bleibt bestehen.${signatur}`,
    },
  };
  const { betreff, text } = inhalt[art];
  const out: Nachricht[] = [];
  if (ctx.kontakt.telefon) out.push({ kanal: 'sms', empfaenger: ctx.kontakt.telefon, betreff: null, text });
  if (ctx.kontakt.email) out.push({ kanal: 'email', empfaenger: ctx.kontakt.email, betreff, text });
  return out;
}
