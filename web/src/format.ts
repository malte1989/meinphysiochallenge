const TZ = 'Europe/Berlin';
const uhr = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const datum = new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' });

export const zeit = (iso: string) => uhr.format(new Date(iso));
export const tag = (iso: string) => {
  const p = Object.fromEntries(datum.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.weekday.replace('.', '')} ${p.day}.${p.month}.`;
};
export const tagZeit = (iso: string) => `${tag(iso)} ${zeit(iso)}`;

/** Demo-Zuordnung der Termino-Standort-IDs (die Antwort der API enthält nur IDs). */
export const PRAXIS: Record<string, string> = { loc_01: 'Mitte', loc_02: 'Kreuzberg' };

export const STUFE_LABEL = { frist: 'Frist', hoch: 'Hoch', normal: 'Normal', pruefen: 'Prüfen' } as const;
export const LEISTUNG: Record<string, string> = { KG: 'Krankengymnastik', MT: 'Manuelle Therapie', MLD45: 'Lymphdrainage 45', KGG: 'Geräte-KG' };

const berlinTag = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
/** Kalendertag in Berlin als YYYY-MM-DD. */
export const isoTag = (iso: string) => berlinTag.format(new Date(iso));
/** Zeitraum eines Ausfalls („bis“ ist der Beginn des Folgetages), z. B. „Mo 07.09.“ oder „Mo 07.09. bis Di 08.09.“. */
export const zeitraum = (von: string, bis: string) => {
  const a = tag(von), b = tag(new Date(Date.parse(bis) - 60_000).toISOString());
  return a === b ? a : `${a} bis ${b}`;
};
