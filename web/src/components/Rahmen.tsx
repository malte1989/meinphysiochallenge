import type { ReactNode } from 'react';
import { Info, Mail, Phone, Printer, UserX } from 'lucide-react';
import { PRAXIS } from '../format';
import type { Therapeut } from '../types';

export type Bereich = 'ausfaelle' | 'anrufliste' | 'outbox' | 'notfallliste';

const BEREICHE = [
  { id: 'ausfaelle', label: 'Alle Ausfälle', Icon: UserX },
  { id: 'anrufliste', label: 'Anrufliste', Icon: Phone },
  { id: 'outbox', label: 'Outbox', Icon: Mail },
  { id: 'notfallliste', label: 'Notfallliste', Icon: Printer },
] as const;

/** Wortmarke als Text (kein Logo aus dem Fremdmaterial). */
export function Marke() {
  return <span className="marke"><span className="marke-mein">mein</span><span className="marke-physio">physio</span><span className="marke-plus">+</span></span>;
}

/** Weißer Rahmen auf Beige: Inhalt links, Seitenleiste rechts, unten der Hinweis zur Demo. */
export function Rahmen({ leiste, children }: { leiste: ReactNode; children: ReactNode }) {
  return (
    <div className="rahmen">
      <div className="inhalt">
        {children}
        <footer className="fusszeile"><Info aria-hidden /> Fiktive Daten · Nachrichten nur simuliert · läuft lokal</footer>
      </div>
      {leiste}
    </div>
  );
}

export function Leer({ children }: { children: ReactNode }) {
  return <main className="leer"><Marke /><p>{children}</p></main>;
}

interface LeisteProps {
  aktiv: Bereich;
  outboxAnzahl: number;
  team?: Therapeut[];
  abwesend: string[];
  onBereich: (b: Bereich) => void;
  children?: ReactNode;
}

/** Rechte Seitenleiste wie im Buchungstool: Marke und Sprache, Bereiche als Schritte mit Icon-Kacheln, unten das Team. */
export function Seitenleiste({ aktiv, outboxAnzahl, team, abwesend, onBereich, children }: LeisteProps) {
  return (
    <aside className="seitenleiste" aria-label="Navigation">
      <div className="leiste-kopf">
        <Marke />
        <span className="sprache" title="Sprache: Deutsch"><span className="flagge" aria-hidden="true" />DE</span>
      </div>
      <nav className="schritte" aria-label="Bereiche">
        {BEREICHE.map(({ id, label, Icon }) => (
          <button key={id} className="schritt" aria-current={id === aktiv ? 'page' : undefined} onClick={() => onBereich(id)}>
            <span className="kachel"><Icon aria-hidden /></span>
            {label}
            {id === 'outbox' && <span className="zaehler">{outboxAnzahl}</span>}
          </button>
        ))}
      </nav>
      {children}
      {team && team.length > 0 && <Team team={team} abwesend={abwesend} />}
    </aside>
  );
}

const FARBEN = ['#27372a', '#596a5c', '#8a6100', '#3c4c3f', '#7d6b57', '#5a5a59', '#b7360a'];
const initialen = (name: string) => name.split(/\s+/).filter(Boolean).map((t) => t[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('');
export function Avatar({ name, index, faelltAus = false }: { name: string; index: number; faelltAus?: boolean }) {
  return (
    <span className={`avatar${faelltAus ? ' faellt-aus' : ''}`} style={{ background: FARBEN[Math.max(0, index) % FARBEN.length] }} title={faelltAus ? `${name} (fällt aus)` : name}>
      {initialen(name)}
    </span>
  );
}

function Team({ team, abwesend }: { team: Therapeut[]; abwesend: string[] }) {
  const sortiert = [...team].sort((a, b) => Number(abwesend.includes(b.name)) - Number(abwesend.includes(a.name)));
  const sichtbar = sortiert.slice(0, 3);
  const rest = sortiert.slice(3);
  return (
    <div className="team">
      <div className="avatare">
        {sichtbar.map((t) => <Avatar key={t.id} name={t.name} index={team.indexOf(t)} faelltAus={abwesend.includes(t.name)} />)}
        {rest.length > 0 && <span className="avatar mehr" title={rest.map((t) => t.name).join(', ')}>+{rest.length}</span>}
      </div>
      <p className="team-text">Team in <strong>{Object.values(PRAXIS).join(' & ')}</strong></p>
    </div>
  );
}
