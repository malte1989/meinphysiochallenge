import type { FaelleAntwort } from '../types';
import { tag } from '../format';
import { Countdown } from './Countdown';

export type Sortierung = 'autopilot' | 'uhrzeit';

interface Props {
  daten: FaelleAntwort;
  sortierung: Sortierung;
  onSortierung: (s: Sortierung) => void;
  onRefresh: () => void;
  fetching: boolean;
  aktualisiertUm: number;
  intervallMs: number;
  onExport: (stand: '0800' | '0805') => void;
  onOutbox: () => void;
  outboxAnzahl: number;
  onReset: () => void;
}

export function Header({ daten, sortierung, onSortierung, onRefresh, fetching, aktualisiertUm, intervallMs, onExport, onOutbox, outboxAnzahl, onReset }: Props) {
  const offen = daten.faelle.filter((f) => f.status === 'offen').length;
  return (
    <header className="kopf">
      <div>
        <h1>meinphysio+ · Ausfall: {daten.ausfall.therapeutName} krank</h1>
        <p className="unter">{tag(daten.ausfall.von)} · <strong>{offen} offen</strong> / {daten.faelle.length - offen} erledigt</p>
      </div>
      <div className="leiste">
        <div className="gruppe" role="group" aria-label="Sortierung">
          <button className={sortierung === 'autopilot' ? 'aktiv' : ''} onClick={() => onSortierung('autopilot')}>Autopilot (Anrufreihenfolge)</button>
          <button className={sortierung === 'uhrzeit' ? 'aktiv' : ''} onClick={() => onSortierung('uhrzeit')}>Uhrzeit</button>
        </div>
        <div className="gruppe" role="group" aria-label="Termino-Export">
          <span className="label">Termino-Export</span>
          <button className={daten.exportStand === '0800' ? 'aktiv' : ''} onClick={() => onExport('0800')}>08:00</button>
          <button className={daten.exportStand === '0805' ? 'aktiv' : ''} onClick={() => onExport('0805')}>08:05</button>
        </div>
        <Countdown seit={aktualisiertUm} intervallMs={intervallMs} />
        <button onClick={onRefresh} disabled={fetching}>{fetching ? 'Aktualisiere …' : 'Jetzt aktualisieren'}</button>
        <button onClick={onOutbox}>Outbox ({outboxAnzahl})</button>
        <button className="link" onClick={onReset}>Demo zurücksetzen</button>
      </div>
    </header>
  );
}
