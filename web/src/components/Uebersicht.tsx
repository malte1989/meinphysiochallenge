import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { isoTag, zeitraum } from '../format';

/** Übersicht aller Ausfälle, dazu das (simulierte) Anlegen einer weiteren Krankmeldung. */
export function Uebersicht() {
  const qc = useQueryClient();
  const liste = useQuery({ queryKey: ['ausfall'], queryFn: api.ausfallListe });
  const personen = useQuery({ queryKey: ['therapeuten'], queryFn: api.therapeuten, staleTime: Infinity });
  const [formular, setFormular] = useState(false);
  const [person, setPerson] = useState('');
  const vorgabe = liste.data?.[0] ? isoTag(new Date(Date.parse(liste.data[0].von) + 3_600_000).toISOString()) : '';
  const [von, setVon] = useState('');
  const [bis, setBis] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);

  const anlegen = useMutation({
    mutationFn: () => api.ausfallAnlegen(person, von || vorgabe, bis || von || vorgabe),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['ausfall'] });
      qc.invalidateQueries({ queryKey: ['faelle'] });
      location.hash = `#/ausfall/${r.id}`;
    },
    onError: (e) => setFehler(e instanceof ApiError && e.fehler === 'bis_vor_beginn' ? 'Das Ende liegt vor dem Beginn.' : 'Anlegen fehlgeschlagen.'),
  });

  if (liste.isError) return <main className="leer">Die API ist nicht erreichbar.</main>;
  return (
    <main className="uebersicht">
      <div className="uebersicht-kopf">
        <div>
          <h1>meinphysio+ · Ausfälle</h1>
          <p className="unter">Alle gemeldeten Ausfälle von Mitarbeiter:innen. Wähle einen Ausfall, um seine Termine zu bearbeiten.</p>
        </div>
        <div className="leiste">
          <a className="knopf" href="#/">Zur Hauptseite</a>
          <button className="primary" onClick={() => { setFormular(!formular); setFehler(null); }}>Neuen Ausfall anlegen</button>
        </div>
      </div>

      {formular && (
        <form className="formular" onSubmit={(e) => { e.preventDefault(); setFehler(null); anlegen.mutate(); }}>
          <p className="hinweis-simuliert"><strong>Simuliert:</strong> Es wird nur der Ausfall angelegt. Es gibt keine Anbindung an ein Personalsystem und keine Benachrichtigung an Patient:innen.</p>
          <label>Mitarbeiter:in
            <select value={person} onChange={(e) => setPerson(e.target.value)} required>
              <option value="">bitte wählen</option>
              {personen.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label>Von <input type="date" value={von || vorgabe} onChange={(e) => setVon(e.target.value)} required /></label>
          <label>Bis (einschließlich) <input type="date" value={bis || von || vorgabe} onChange={(e) => setBis(e.target.value)} required /></label>
          <button className="primary" type="submit" disabled={!person || anlegen.isPending}>Ausfall anlegen</button>
          {fehler && <span className="warn-text" role="alert">{fehler}</span>}
        </form>
      )}

      <div className="ausfaelle">
        {liste.data?.map((a) => (
          <article key={a.id} className="ausfall" data-testid="ausfall">
            <div>
              <h2>{a.therapeutName}</h2>
              <p className="unter">{zeitraum(a.von, a.bis)}</p>
              <p><strong>{a.anzahl}</strong> Termine betroffen · <strong>{a.offen}</strong> offen</p>
            </div>
            <a className="knopf primary" href={`#/ausfall/${a.id}`}>Fälle öffnen</a>
          </article>
        ))}
        {liste.isLoading && <p>Lade …</p>}
      </div>
    </main>
  );
}
