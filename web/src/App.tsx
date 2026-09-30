import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { FallKarte } from './components/FallKarte';
import { Header, TerminoSteuerung, type Sortierung } from './components/Header';
import { Notfallliste } from './components/Notfallliste';
import { OutboxDrawer } from './components/OutboxDrawer';
import { Leer, Rahmen, Seitenleiste, type Bereich } from './components/Rahmen';
import { Uebersicht } from './components/Uebersicht';
import './styles.css';

const REFRESH_MS = 5 * 60_000;

type Route = { seite: 'uebersicht' } | { seite: 'druck' } | { seite: 'faelle'; id: string | null };
const leseRoute = (): Route => {
  const h = location.hash;
  if (h === '#/ausfaelle') return { seite: 'uebersicht' };
  if (h === '#druck') return { seite: 'druck' };
  return { seite: 'faelle', id: h.match(/^#\/ausfall\/([^/]+)$/)?.[1] ?? null };
};

export function App() {
  const qc = useQueryClient();
  const [route, setRoute] = useState<Route>(leseRoute);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [sortierung, setSortierung] = useState<Sortierung>('autopilot');
  const [outboxOffen, setOutboxOffen] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  useEffect(() => {
    const f = () => setRoute(leseRoute());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useEffect(() => { if (route.seite === 'faelle' && route.id) setGewaehlt(route.id); }, [route]);

  const liste = useQuery({ queryKey: ['ausfall'], queryFn: api.ausfallListe });
  const ausfallId = (route.seite === 'faelle' && route.id) || gewaehlt || liste.data?.[0]?.id;
  const faelle = useQuery({ queryKey: ['faelle', ausfallId], queryFn: () => api.faelle(ausfallId!), enabled: !!ausfallId && route.seite !== 'uebersicht', refetchInterval: REFRESH_MS });
  const diagnosen = useQuery({ queryKey: ['diagnosegruppen'], queryFn: api.diagnosegruppen, staleTime: Infinity });
  const outbox = useQuery({ queryKey: ['outbox'], queryFn: api.outbox });
  const team = useQuery({ queryKey: ['therapeuten'], queryFn: api.therapeuten, staleTime: Infinity });

  const aktualisieren = () => Promise.all([qc.invalidateQueries({ queryKey: ['faelle'] }), qc.invalidateQueries({ queryKey: ['ausfall'] }), qc.invalidateQueries({ queryKey: ['outbox'] }), qc.invalidateQueries({ queryKey: ['slots'] })]);
  const exportWechseln = useMutation({
    mutationFn: api.setExport,
    onSuccess: (r) => { setHinweis(r.konflikte.length ? `Konflikt mit eigenen Buchungen bei: ${r.konflikte.join(', ')}` : null); aktualisieren(); },
  });
  const verlaengern = useMutation({ mutationFn: (bis: string) => api.verlaengern(ausfallId!, bis), onSuccess: () => aktualisieren() });
  const reset = useMutation({ mutationFn: api.reset, onSuccess: () => { setHinweis(null); aktualisieren(); } });

  const zuBereich = (b: Bereich) => {
    if (b === 'outbox') setOutboxOffen(true);
    else if (b === 'ausfaelle') location.hash = '#/ausfaelle';
    else if (b === 'notfallliste') location.hash = '#druck';
    else if (route.seite === 'faelle') window.scrollTo({ top: 0, behavior: 'smooth' });
    else location.hash = ausfallId ? `#/ausfall/${ausfallId}` : '#/';
  };
  const leiste = (aktiv: Bereich, abwesend: string[], extra?: ReactNode) => (
    <Seitenleiste aktiv={aktiv} outboxAnzahl={outbox.data?.length ?? 0} team={team.data} abwesend={abwesend} onBereich={zuBereich}>{extra}</Seitenleiste>
  );
  const drawer = outboxOffen && <OutboxDrawer onClose={() => setOutboxOffen(false)} />;

  if (route.seite === 'uebersicht') {
    return (
      <>
        <Rahmen leiste={leiste('ausfaelle', liste.data?.map((a) => a.therapeutName) ?? [])}><Uebersicht gewaehlt={ausfallId} /></Rahmen>
        {drawer}
      </>
    );
  }
  if (liste.isError) return <Leer>Die API ist nicht erreichbar.</Leer>;
  if (faelle.isError) return <Leer>Dieser Ausfall existiert nicht mehr. <a href="#/ausfaelle">Alle Ausfälle</a></Leer>;
  if (!faelle.data) return <Leer>Lade …</Leer>;

  const daten = faelle.data;
  if (route.seite === 'druck') {
    return <Notfallliste faelle={daten.faelle} ausfallName={daten.ausfall.therapeutName} stand={daten.jetzt} onZurueck={() => { location.hash = `#/ausfall/${daten.ausfall.id}`; }} />;
  }
  const sortiert = sortierung === 'autopilot'
    ? [...daten.faelle].sort((a, b) => a.anrufRang - b.anrufRang)
    : [...daten.faelle].sort((a, b) => a.appointment.startsAt.localeCompare(b.appointment.startsAt));

  const termino = (
    <TerminoSteuerung
      exportStand={daten.exportStand} onExport={(s) => exportWechseln.mutate(s)} onRefresh={aktualisieren} fetching={faelle.isFetching}
      aktualisiertUm={faelle.dataUpdatedAt} intervallMs={REFRESH_MS} onReset={() => reset.mutate()}
    />
  );

  return (
    <>
      <Rahmen leiste={leiste('anrufliste', [daten.ausfall.therapeutName], termino)}>
        <Header daten={daten} sortierung={sortierung} onSortierung={setSortierung} onVerlaengern={(bis) => verlaengern.mutate(bis)} />
        {hinweis && <div className="hinweis" role="alert">{hinweis} <button className="link" onClick={() => setHinweis(null)}>ok</button></div>}
        <main className="liste">
          {sortiert.map((f) => <FallKarte key={f.appointment.id} fall={f} jetzt={daten.jetzt} diagnosen={diagnosen.data} onChanged={aktualisieren} onHinweis={setHinweis} />)}
        </main>
      </Rahmen>
      {drawer}
    </>
  );
}
