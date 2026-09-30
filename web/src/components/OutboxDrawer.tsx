import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export function OutboxDrawer({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['outbox'], queryFn: api.outbox });
  return (
    <aside className="drawer" aria-label="Outbox">
      <div className="drawer-kopf"><strong>Outbox (simuliert, nichts wird versendet)</strong><button className="link" onClick={onClose}>schließen</button></div>
      {data?.length === 0 && <p>Noch keine Nachrichten.</p>}
      {data?.map((m) => (
        <div key={m.id} className="nachricht">
          <div className="nachricht-kopf">{m.kanal === 'sms' ? '📱 SMS' : '✉️ E-Mail'} an {m.empfaenger}</div>
          {m.betreff && <div className="nachricht-betreff">{m.betreff}</div>}
          <div>{m.text}</div>
        </div>
      ))}
    </aside>
  );
}
