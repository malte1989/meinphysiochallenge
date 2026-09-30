import { PRAXIS, tag, zeit } from '../format';
import type { Fall } from '../types';

const EMPFEHLUNG: Record<Fall['empfehlung'], string> = {
  umbuchen: 'Umbuchen', ersatzlos_absagen: 'Ersatzlos absagen', doppelbuchung_stornieren: 'Doppelbuchung stornieren',
  absagen_mit_link: 'Absagen, Link senden', eskalieren: 'Standortleitung',
};

/** Druckbare Anrufliste für den Fall, dass unser Service oder Termino nicht erreichbar ist (Stand beim Drucken). */
export function Notfallliste({ faelle, ausfallName, stand, onZurueck }: { faelle: Fall[]; ausfallName: string; stand: string; onZurueck: () => void }) {
  const sortiert = [...faelle].sort((a, b) => a.anrufRang - b.anrufRang);
  return (
    <main className="notfall">
      <div className="notfall-kopf">
        <h1>Notfallliste: Ausfall {ausfallName}</h1>
        <div className="keine-druck">
          <button onClick={onZurueck}>Zurück zur Oberfläche</button>
          <button className="primary" onClick={() => window.print()}>Drucken</button>
        </div>
      </div>
      <p>Stand {tag(stand)} {zeit(stand)} Uhr, Anrufreihenfolge. Vermerk bitte handschriftlich: erreicht, Termin neu, abgesagt.</p>
      <table>
        <thead><tr><th>#</th><th>Zeit</th><th>Praxis</th><th>Patient:in</th><th>Telefon</th><th>Empfehlung</th><th>Vorschlag</th><th>Hinweise</th><th>Vermerk</th></tr></thead>
        <tbody>
          {sortiert.map((f, i) => {
            const tel = f.patient?.telefon ?? f.appointment.patient.phone;
            return (
              <tr key={f.appointment.id}>
                <td>{i + 1}</td>
                <td>{zeit(f.appointment.startsAt)}</td>
                <td>{PRAXIS[f.appointment.locationId] ?? f.appointment.locationId}</td>
                <td>{f.appointment.patient.name}</td>
                <td>{tel ?? <strong>keine Nummer</strong>}</td>
                <td>{EMPFEHLUNG[f.empfehlung]}</td>
                <td>{f.vorschlag ? `${tag(f.vorschlag.startsAt)} ${zeit(f.vorschlag.startsAt)} ${f.vorschlag.therapeutName}, ${f.vorschlag.praxisName}` : '–'}</td>
                <td>{[...f.gruende, ...f.warnungen.map((w) => w.text)].join('; ')}</td>
                <td className="vermerk"></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
