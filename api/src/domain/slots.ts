import { findeFaelle } from './enrich.js';
import { addDays, berlinDate, berlinTime, berlinWallToUtc, berlinWeekday } from './time.js';
import type { AutopilotInput, Fall, Slot } from './types.js';

const RASTER_MIN = 20;
const VORLAUF_MIN = 20;
const MIN = 60_000;

const ueberlappt = (aStart: number, aEnde: number, bStart: number, bEnde: number) => aStart < bEnde && bStart < aEnde;

/** Alle freien, passenden Slots für einen Fall, nach Rang sortiert. `reserviert` sind bereits vergebene Vorschläge. */
export function freieSlots(fall: Pick<Fall, 'appointment' | 'heilmittel' | 'frist'>, input: AutopilotInput, reserviert: Slot[]): Slot[] {
  const a = fall.appointment;
  const dauer = a.durationMin;
  const fruehestens = Date.parse(input.jetzt) + VORLAUF_MIN * MIN;
  const ausfallVon = Date.parse(input.ausfall.von);
  const ausfallBis = Date.parse(input.ausfall.bis);
  const fallIds = new Set(findeFaelle(input).map((f) => f.id));
  const ausgefallen = input.therapeuten.find((t) => t.id === input.ausfall.therapeutId);

  const heute = berlinDate(input.jetzt);
  const letzterTag = fall.frist && fall.frist < input.exportFensterBis ? fall.frist : input.exportFensterBis;
  const tageMitTermin = new Set(
    input.appointments
      .filter((x) => x.patient.id === a.patient.id && x.status === 'booked' && x.id !== a.id && !fallIds.has(x.id))
      .map((x) => berlinDate(x.startsAt)),
  );
  const belegt = new Map<string, [number, number][]>();
  for (const x of input.appointments) {
    if (x.status !== 'booked') continue;
    const start = Date.parse(x.startsAt);
    (belegt.get(x.practitionerId) ?? belegt.set(x.practitionerId, []).get(x.practitionerId)!).push([start, start + x.durationMin * MIN]);
  }
  for (const r of reserviert) {
    const start = Date.parse(r.startsAt);
    (belegt.get(r.practitionerId) ?? belegt.set(r.practitionerId, []).get(r.practitionerId)!).push([start, Date.parse(r.endsAt)]);
  }

  const ursprungsTag = berlinDate(a.startsAt);
  const ursprungsUhrzeit = berlinTime(a.startsAt);
  const slots: Slot[] = [];

  for (let tag = heute; tag <= letzterTag; tag = addDays(tag, 1)) {
    const wochentag = berlinWeekday(tag);
    if (wochentag < 1 || wochentag > 5 || tageMitTermin.has(tag)) continue;
    for (const t of input.therapeuten.filter((x) => x.qualifikationen.includes(fall.heilmittel))) {
      for (const block of input.arbeitszeiten.filter((z) => z.therapeutId === t.id && z.wochentag === wochentag)) {
        const praxis = input.praxen.find((p) => p.id === block.praxisId)!;
        const blockEnde = Date.parse(berlinWallToUtc(tag, block.bis));
        for (let start = Date.parse(berlinWallToUtc(tag, block.von)); start + dauer * MIN <= blockEnde; start += RASTER_MIN * MIN) {
          const ende = start + dauer * MIN;
          if (start < fruehestens) continue;
          if (t.id === ausgefallen?.id && start >= ausfallVon && start < ausfallBis) continue;
          if ((belegt.get(t.terminoPractitionerId) ?? []).some(([s, e]) => ueberlappt(start, ende, s, e))) continue;
          const iso = new Date(start).toISOString();
          const gleichePraxis = praxis.terminoLocationId === a.locationId;
          const gleicherTag = tag === ursprungsTag;
          const gleicheUhrzeit = gleicherTag && gleichePraxis && berlinTime(iso) === ursprungsUhrzeit;
          const rang = gleicheUhrzeit ? 1 : gleicherTag && gleichePraxis ? 2 : gleicherTag ? 3 : 4;
          slots.push({
            practitionerId: t.terminoPractitionerId, therapeutName: `${t.vorname} ${t.nachname}`, praxisId: praxis.id,
            praxisName: praxis.name, locationId: praxis.terminoLocationId, startsAt: iso, endsAt: new Date(ende).toISOString(),
            rang: rang as Slot['rang'], gleicheUhrzeit,
          });
        }
      }
    }
  }
  const tagVon = (s: Slot) => berlinDate(s.startsAt);
  return slots.sort((x, y) =>
    x.rang - y.rang || tagVon(x).localeCompare(tagVon(y)) ||
    Number(x.locationId !== a.locationId) - Number(y.locationId !== a.locationId) || x.startsAt.localeCompare(y.startsAt));
}
