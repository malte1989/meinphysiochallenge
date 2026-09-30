import { readFileSync } from 'node:fs';
import type { Appointment, AutopilotInput, Heilmittel } from '../src/domain/types.js';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8'));
const WOCHENTAG: Record<string, 1 | 2 | 3 | 4 | 5> = { mo: 1, di: 2, mi: 3, do: 4, fr: 5 };

export function loadFixtureInput(stand: '0800' | '0805' = '0805'): AutopilotInput {
  const export_ = read(`termino_export_2026-09-07_${stand}.json`);
  return {
    jetzt: '2026-09-07T05:40:00Z',
    ausfall: {
      id: 'ausfall-1', therapeutId: '2a3bbf28-bd84-438e-91ca-604f8cd93fb2',
      von: '2026-09-06T22:00:00Z', bis: '2026-09-07T22:00:00Z', createdAt: '2026-09-07T05:40:00Z',
    },
    appointments: export_.appointments.map((a: any): Appointment => ({
      id: a.id, locationId: a.location_id, practitionerId: a.practitioner_id, service: a.service,
      startsAt: a.starts_at, durationMin: a.duration_min, status: a.status, patient: a.patient,
      bookedAt: a.booked_at, updatedAt: a.updated_at, source: 'export',
    })),
    patienten: read('patienten.json').map((p: any) => ({
      id: p.id, vorname: p.vorname, nachname: p.nachname, geburtsdatum: p.geburtsdatum,
      telefon: p.telefon, email: p.email, terminoPatientId: p.termino_patient_id,
    })),
    verordnungen: read('verordnungen.json').map((v: any) => ({
      id: v.id, patientId: v.patient_id, ausstellungsdatum: v.ausstellungsdatum, diagnosegruppe: v.diagnosegruppe,
      heilmittel: v.heilmittel as Heilmittel, verordnungsmenge: v.verordnungsmenge, frequenzProWoche: v.frequenz_pro_woche,
    })),
    therapeuten: read('therapeuten.json').map((t: any) => ({
      id: t.id, vorname: t.vorname, nachname: t.nachname, qualifikationen: t.qualifikationen,
      terminoPractitionerId: t.termino_practitioner_id,
    })),
    arbeitszeiten: read('therapeuten.json').flatMap((t: any) =>
      Object.entries<any[]>(t.arbeitszeiten).flatMap(([tag, bloecke]) =>
        bloecke.map((b) => ({ therapeutId: t.id, wochentag: WOCHENTAG[tag], praxisId: b.praxis_id, von: b.von, bis: b.bis })))),
    praxen: read('praxen.json').map((p: any) => ({ id: p.id, name: p.name, terminoLocationId: p.termino_location_id })),
    entscheidungen: [],
    exportFensterBis: '2026-09-13',
    absageTage: 2,
  };
}
