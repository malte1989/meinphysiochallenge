import { useState } from 'react';
import { CalendarDays, CalendarPlus, ChevronDown, RefreshCw, RotateCcw } from 'lucide-react';
import type { FaelleAntwort } from '../types';
import { tag, zeitraum } from '../format';
import { Countdown } from './Countdown';

export type Sortierung = 'autopilot' | 'uhrzeit';

interface Props {
  daten: FaelleAntwort;
  sortierung: Sortierung;
  onSortierung: (s: Sortierung) => void;
  onVerlaengern: (bis: string) => void;
}

/** Kopf der Anrufliste: großer Titel mit Akzent, Kennzahlen als Pillen, Sortierung und Verlängern. */
export function Header({ daten, sortierung, onSortierung, onVerlaengern }: Props) {
  const [menue, setMenue] = useState(false);
  const tage = [1, 2, 4].map((n) => {
    const bis = new Date(Date.parse(daten.ausfall.bis) + n * 86_400_000);
    return { bis: bis.toISOString(), label: tag(new Date(bis.getTime() - 60_000).toISOString()) };
  });
  const offen = daten.faelle.filter((f) => f.status === 'offen').length;
  return (
    <header className="seitenkopf">
      <h1 className="titel">{daten.ausfall.therapeutName} ist krank<span className="akzent">.</span></h1>
      <p className="lead">
        {sortierung === 'autopilot' ? 'Anrufreihenfolge nach Dringlichkeit, zu jedem Termin ein begründeter Vorschlag.' : 'Alle betroffenen Termine nach Uhrzeit.'}
      </p>
      <div className="kennzahlen">
        <span className="pille"><CalendarDays aria-hidden /> {zeitraum(daten.ausfall.von, daten.ausfall.bis)}</span>
        <span className="pille"><strong>{offen} offen</strong></span>
        <span className="pille">{daten.faelle.length - offen} erledigt</span>
      </div>
      <div className="werkzeuge">
        <div className="gruppe" role="group" aria-label="Sortierung">
          <button className={sortierung === 'autopilot' ? 'aktiv' : ''} onClick={() => onSortierung('autopilot')}>Autopilot (Anrufreihenfolge)</button>
          <button className={sortierung === 'uhrzeit' ? 'aktiv' : ''} onClick={() => onSortierung('uhrzeit')}>Uhrzeit</button>
        </div>
        <div className="menue">
          <button onClick={() => setMenue(!menue)} aria-expanded={menue}><CalendarPlus aria-hidden /> Krankmeldung verlängern <ChevronDown aria-hidden /></button>
          {menue && (
            <div className="menue-liste">
              {tage.map((t) => (
                <button key={t.bis} onClick={() => { setMenue(false); onVerlaengern(t.bis); }}>bis {t.label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface TerminoProps {
  exportStand: FaelleAntwort['exportStand'];
  onExport: (stand: '0800' | '0805') => void;
  onRefresh: () => void;
  fetching: boolean;
  aktualisiertUm: number;
  intervallMs: number;
  onReset: () => void;
}

/** Termino-Stand in der Seitenleiste: Export umschalten, Countdown, sofort aktualisieren, Demo zurücksetzen. */
export function TerminoSteuerung({ exportStand, onExport, onRefresh, fetching, aktualisiertUm, intervallMs, onReset }: TerminoProps) {
  return (
    <section className="leiste-box" aria-label="Termino">
      <p className="leiste-label">Termino-Export</p>
      <div className="gruppe" role="group" aria-label="Termino-Export">
        <button className={exportStand === '0800' ? 'aktiv' : ''} onClick={() => onExport('0800')}>08:00</button>
        <button className={exportStand === '0805' ? 'aktiv' : ''} onClick={() => onExport('0805')}>08:05</button>
      </div>
      <Countdown seit={aktualisiertUm} intervallMs={intervallMs} />
      <button className="voll" onClick={onRefresh} disabled={fetching} title="Lädt Fälle, Vorschläge und Outbox sofort neu, ohne die 5 Minuten abzuwarten. Die Vorschläge werden dabei aus dem aktuellen Termino-Stand neu berechnet.">
        <RefreshCw aria-hidden /> {fetching ? 'Aktualisiere …' : 'Jetzt aktualisieren'}
      </button>
      <button className="link klein" onClick={onReset}><RotateCcw aria-hidden /> Demo zurücksetzen</button>
    </section>
  );
}
