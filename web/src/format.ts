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
