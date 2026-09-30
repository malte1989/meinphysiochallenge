export interface TerminoPatient { id: string; name: string; birth_date: string; phone: string | null; email: string | null }
export interface Appointment {
  id: string; locationId: string; practitionerId: string; service: string; startsAt: string; durationMin: number;
  status: 'booked' | 'cancelled'; patient: TerminoPatient; bookedAt: string; updatedAt: string; source: 'export' | 'api' | 'patient';
}
export type NewAppointment = Omit<Appointment, 'id' | 'status' | 'bookedAt' | 'updatedAt'> & { at: string };

export class ConflictError extends Error {}

export interface TerminoClient {
  listAppointments(): Promise<Appointment[]>;
  book(a: NewAppointment): Promise<Appointment>;
  cancel(id: string, at: string): Promise<void>;
}
