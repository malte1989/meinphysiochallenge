import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { FallKarte } from './components/FallKarte';
import { Header, type Sortierung } from './components/Header';
import { Notfallliste } from './components/Notfallliste';
import { OutboxDrawer } from './components/OutboxDrawer';
import './styles.css';

const REFRESH_MS = 5 * 60_000;

export function App() {
  const qc = useQueryClient();
  const [sortierung, setSortierung] = useState<Sortierung>('autopilot');
  const [outboxOffen, setOutboxOffen] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [druck, setDruck] = useState(() => location.hash === '#druck');
  useEffect(() => {
    const f = () => setDruck(location.hash === '#druck');
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  const liste = useQuery({ queryKey: ['ausfall'], queryFn: api.ausfallListe });
  const ausfallId = liste.data?.[0]?.id;
  const faelle = useQuery({ queryKey: ['faelle', ausfallId], queryFn: () => api.faelle(ausfallId!), enabled: !!ausfallId, refetchInterval: REFRESH_MS });
  const diagnosen = useQuery({ queryKey: ['diagnosegruppen'], queryFn: api.diagnosegruppen, staleTime: Infinity });
  const outbox = useQuery({ queryKey: ['outbox'], queryFn: api.outbox });

  const aktualisieren = () => Promise.all([qc.invalidateQueries({ queryKey: ['faelle'] }), qc.invalidateQueries({ queryKey: ['outbox'] }), qc.invalidateQueries({ queryKey: ['slots'] })]);
  const exportWechseln = useMutation({
    mutationFn: api.setExport,
    onSuccess: (r) => { setHinweis(r.konflikte.length ? `Konflikt mit eigenen Buchungen bei: ${r.konflikte.join(', ')}` : null); aktualisieren(); },
  });
  const verlaengern = useMutation({ mutationFn: (bis: string) => api.verlaengern(ausfallId!, bis), onSuccess: () => { qc.invalidateQueries({ queryKey: ['ausfall'] }); aktualisieren(); } });
  const reset = useMutation({ mutationFn: api.reset, onSuccess: () => { setHinweis(null); aktualisieren(); } });

  if (liste.isError || faelle.isError) return <main className="leer">Die API ist nicht erreichbar.</main>;
  if (!faelle.data) return <main className="leer">Lade …</main>;

  const daten = faelle.data;
  if (druck) {
    return <Notfallliste faelle={daten.faelle} ausfallName={daten.ausfall.therapeutName} stand={daten.jetzt} onZurueck={() => { location.hash = ''; }} />;
  }
  const sortiert = sortierung === 'autopilot'
    ? [...daten.faelle].sort((a, b) => a.anrufRang - b.anrufRang)
    : [...daten.faelle].sort((a, b) => a.appointment.startsAt.localeCompare(b.appointment.startsAt));

  return (
    <>
      <Header
        daten={daten} sortierung={sortierung} onSortierung={setSortierung} fetching={faelle.isFetching} aktualisiertUm={faelle.dataUpdatedAt} intervallMs={REFRESH_MS}
        onRefresh={aktualisieren} onExport={(s) => exportWechseln.mutate(s)} onOutbox={() => setOutboxOffen(true)}
        outboxAnzahl={outbox.data?.length ?? 0} onReset={() => reset.mutate()} onVerlaengern={(bis) => verlaengern.mutate(bis)} onNotfallliste={() => { location.hash = '#druck'; }}
      />
      {hinweis && <div className="hinweis" role="alert">{hinweis} <button className="link" onClick={() => setHinweis(null)}>ok</button></div>}
      <main className="liste">
        {sortiert.map((f) => <FallKarte key={f.appointment.id} fall={f} jetzt={daten.jetzt} diagnosen={diagnosen.data} onChanged={aktualisieren} onHinweis={setHinweis} />)}
      </main>
      {outboxOffen && <OutboxDrawer onClose={() => setOutboxOffen(false)} />}
    </>
  );
}
