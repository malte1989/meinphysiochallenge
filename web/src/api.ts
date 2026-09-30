import type { AusfallInfo, Diagnosegruppe, FaelleAntwort, OutboxEintrag, SlotMitReservierung } from './types';

export class ApiError extends Error {
  constructor(public status: number, public fehler: string) { super(fehler); }
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, data?.fehler ?? 'fehler');
  return data as T;
}

export const api = {
  ausfallListe: () => req<AusfallInfo[]>('GET', '/api/ausfall'),
  verlaengern: (id: string, bis: string) => req<{ ok: true }>('PATCH', `/api/ausfall/${id}`, { bis }),
  diagnosegruppen: () => req<Record<string, Diagnosegruppe>>('GET', '/api/diagnosegruppen'),
  faelle: (id: string) => req<FaelleAntwort>('GET', `/api/ausfall/${id}/faelle`),
  slots: (appointmentId: string) => req<SlotMitReservierung[]>('GET', `/api/faelle/${appointmentId}/slots`),
  umbuchen: (appointmentId: string, practitionerId: string, startsAt: string) =>
    req<{ neuerTerminId: string }>('POST', `/api/faelle/${appointmentId}/umbuchen`, { practitionerId, startsAt }),
  absagen: (appointmentId: string, art: 'mit_link' | 'ersatzlos' | 'doppelbuchung') =>
    req<{ ok: true }>('POST', `/api/faelle/${appointmentId}/absagen`, { art }),
  verknuepfen: (patientId: string, terminoPatientId: string) =>
    req<{ ok: true }>('POST', `/api/patienten/${patientId}/verknuepfen`, { terminoPatientId }),
  outbox: () => req<OutboxEintrag[]>('GET', '/api/outbox'),
  setExport: (stand: '0800' | '0805') => req<{ stand: string; konflikte: string[] }>('POST', '/api/sim/export', { stand }),
  selbstbuchung: (appointmentId: string) => req<{ neuerTerminId: string }>('POST', '/api/sim/selbstbuchung', { appointmentId }),
  reset: () => req<{ ok: true }>('POST', '/api/sim/reset'),
};
