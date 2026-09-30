import { ArrowLeft, Printer } from 'lucide-react';
import { PRAXIS, tag, zeit } from '../format';
import type { Fall } from '../types';
import { Marke } from './Rahmen';

const EMPFEHLUNG: Record<Fall['empfehlung'], string> = {
  umbuchen: 'Umbuchen', ersatzlos_absagen: 'Ersatzlos absagen', doppelbuchung_stornieren: 'Doppelbuchung stornieren',
  absagen_mit_link: 'Absagen, Link senden', eskalieren: 'Standortleitung',
};

/** Druckbare Anrufliste für den Fall, dass unser Service oder Termino nicht erreichbar ist (Stand beim Drucken). */
export function Notfallliste({ faelle, ausfallName, stand, onZurueck }: { faelle: Fall[]; ausfallName: string; stand: string; onZurueck: () => void }) {
  const sortiert = [...faelle].sort((a, b) => a.anrufRang - b.anrufRang);
  return (
    <div className="blatt">
      <main className="notfall">
        <div className="notfall-kopf">
          <div>
            <Marke />
            <h1 className="titel">Notfallliste: Ausfall {ausfallName}<span className="akzent">.</span></h1>
          </div>
          <div className="keine-druck leiste">
            <button onClick={onZurueck}><ArrowLeft aria-hidden /> Zurück zur Oberfläche</button>
            <button className="primary" onClick={() => window.print()}><Printer aria-hidden /> Drucken</button>
          </div>
        </div>
        <p className="lead">Stand {tag(stand)} {zeit(stand)} Uhr, Anrufreihenfolge. Vermerk bitte handschriftlich: erreicht, Termin neu, abgesagt.</p>
        <div className="tabelle">
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
        </div>
      </main>
    </div>
  );
}
