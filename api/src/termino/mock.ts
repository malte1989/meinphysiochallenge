import { randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { type Appointment, ConflictError, type NewAppointment, type TerminoClient } from './client.js';

const EXCLUSION_VIOLATION = '23P01';

export function rowToAppointment(r: any): Appointment {
  return {
    id: r.id, locationId: r.location_id, practitionerId: r.practitioner_id, service: r.service,
    startsAt: new Date(r.starts_at).toISOString(), durationMin: r.duration_min, status: r.status,
    patient: r.patient, bookedAt: new Date(r.booked_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
    source: r.source,
  };
}

export class MockTerminoClient implements TerminoClient {
  constructor(private readonly pool: Pool) {}

  async listAppointments(): Promise<Appointment[]> {
    const { rows } = await this.pool.query('select * from termino.appointment order by starts_at');
    return rows.map(rowToAppointment);
  }

  async book(a: NewAppointment): Promise<Appointment> {
    const id = `apt_api_${randomBytes(4).toString('hex')}`;
    try {
      const { rows } = await this.pool.query(
        `insert into termino.appointment (id, location_id, practitioner_id, service, starts_at, ends_at, duration_min, status, patient, booked_at, updated_at, source)
         values ($1,$2,$3,$4,$5::timestamptz,$5::timestamptz + make_interval(mins => $6),$6,'booked',$7,$8,$8,$9) returning *`,
        [id, a.locationId, a.practitionerId, a.service, a.startsAt, a.durationMin, a.patient, a.at, a.source],
      );
      return rowToAppointment(rows[0]);
    } catch (e: any) {
      if (e.code === EXCLUSION_VIOLATION) throw new ConflictError('Slot inzwischen belegt');
      throw e;
    }
  }

  async cancel(id: string, at: string): Promise<void> {
    await this.pool.query(`update termino.appointment set status='cancelled', updated_at=$2 where id=$1`, [id, at]);
  }
}
