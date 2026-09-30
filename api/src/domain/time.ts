const TZ = 'Europe/Berlin';
const DAY = 86_400_000;

const parts = (d: Date) => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  return Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value])) as Record<string, string>;
};

export const berlinDate = (iso: string): string => {
  const p = parts(new Date(iso));
  return `${p.year}-${p.month}-${p.day}`;
};

export const berlinTime = (iso: string): string => {
  const p = parts(new Date(iso));
  return `${p.hour}:${p.minute}`;
};

export const berlinWeekday = (date: string): number => new Date(`${date}T12:00:00Z`).getUTCDay();

export const addDays = (date: string, n: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/** Berliner Wandzeit (Datum + HH:MM) → UTC-ISO. Berücksichtigt Sommer- und Winterzeit. */
export function berlinWallToUtc(date: string, hhmm: string): string {
  const wall = Date.parse(`${date}T${hhmm}:00Z`);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess));
    const shown = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
    guess -= shown - wall;
  }
  return new Date(guess).toISOString();
}

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const datumKurz = (date: string): string => `${date.slice(8, 10)}.${date.slice(5, 7)}.`;
export const wochentagKurz = (iso: string): string => `${WOCHENTAGE[berlinWeekday(berlinDate(iso))]} ${datumKurz(berlinDate(iso))}`;
