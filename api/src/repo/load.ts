import type { Pool } from 'pg';
import { config } from '../config.js';
import type { AutopilotInput, Heilmittel } from '../domain/types.js';
import { MockTerminoClient } from '../termino/mock.js';

const iso = (d: Date) => d.toISOString();

export async function aktuellerAusfallId(pool: Pool): Promise<string | null> {
  const { rows } = await pool.query('select id from ausfall.ausfall order by created_at desc limit 1');
  return rows[0]?.id ?? null;
}

export async function loadInput(pool: Pool, ausfallId: string): Promise<AutopilotInput> {
  const q = async (sql: string, p: unknown[] = []) => (await pool.query(sql, p)).rows;
  const [ausfall] = await q('select * from ausfall.ausfall where id=$1', [ausfallId]);
  if (!ausfall) throw new Error(`Ausfall ${ausfallId} nicht gefunden`);
  return {
    jetzt: config.now,
    ausfall: { id: ausfall.id, therapeutId: ausfall.therapeut_id, von: iso(ausfall.von), bis: iso(ausfall.bis), createdAt: iso(ausfall.created_at) },
    appointments: await new MockTerminoClient(pool).listAppointments(),
    patienten: (await q(`select id, vorname, nachname, to_char(geburtsdatum,'YYYY-MM-DD') geburtsdatum, telefon, email, termino_patient_id from stamm.patient`))
      .map((r) => ({ id: r.id, vorname: r.vorname, nachname: r.nachname, geburtsdatum: r.geburtsdatum, telefon: r.telefon, email: r.email, terminoPatientId: r.termino_patient_id })),
    verordnungen: (await q(`select id, patient_id, to_char(ausstellungsdatum,'YYYY-MM-DD') ausstellungsdatum, diagnosegruppe, heilmittel, verordnungsmenge, frequenz_pro_woche from stamm.verordnung`))
      .map((r) => ({ id: r.id, patientId: r.patient_id, ausstellungsdatum: r.ausstellungsdatum, diagnosegruppe: r.diagnosegruppe, heilmittel: r.heilmittel as Heilmittel, verordnungsmenge: r.verordnungsmenge, frequenzProWoche: r.frequenz_pro_woche })),
    therapeuten: (await q('select * from stamm.therapeut')).map((r) => ({ id: r.id, vorname: r.vorname, nachname: r.nachname, qualifikationen: r.qualifikationen, terminoPractitionerId: r.termino_practitioner_id })),
    arbeitszeiten: (await q(`select therapeut_id, wochentag, praxis_id, to_char(von,'HH24:MI') von, to_char(bis,'HH24:MI') bis from stamm.arbeitszeit`))
      .map((r) => ({ therapeutId: r.therapeut_id, wochentag: r.wochentag, praxisId: r.praxis_id, von: r.von, bis: r.bis })),
    praxen: (await q('select * from stamm.praxis')).map((r) => ({ id: r.id, name: r.name, terminoLocationId: r.termino_location_id })),
    entscheidungen: (await q('select * from ausfall.entscheidung')).map((r) => ({ appointmentId: r.appointment_id, aktion: r.aktion, neuerTerminId: r.neuer_termin_id, createdAt: iso(r.created_at) })),
    exportFensterBis: config.exportFensterBis,
    absageTage: config.absageTage,
  };
}
