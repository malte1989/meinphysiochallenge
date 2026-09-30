import type { Fall } from '../types';

export function MatchVergleich({ fall, onZusammenfuehren, busy }: { fall: Fall; onZusammenfuehren: () => void; busy: boolean }) {
  if (!fall.patient) return null;
  const t = fall.appointment.patient;
  const p = fall.patient;
  const zeilen: [string, string | null, string | null][] = [
    ['Name', t.name, `${p.vorname} ${p.nachname}`],
    ['Geburtsdatum', t.birth_date, p.geburtsdatum],
    ['Telefon', t.phone, p.telefon],
    ['E-Mail', t.email, p.email],
  ];
  return (
    <div className="match">
      <strong>Identität prüfen: Termino ↔ Stammdaten</strong>
      <table>
        <thead><tr><th></th><th>Termino</th><th>Stammdaten</th></tr></thead>
        <tbody>
          {zeilen.map(([k, a, b]) => (
            <tr key={k} className={a === b ? '' : 'abweichung'}><td>{k}</td><td>{a ?? '–'}</td><td>{b ?? '–'}</td></tr>
          ))}
        </tbody>
      </table>
      <button disabled={busy} onClick={onZusammenfuehren}>Zusammenführen</button>
    </div>
  );
}
