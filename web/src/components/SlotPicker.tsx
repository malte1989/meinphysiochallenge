import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { tag, zeit } from '../format';
import type { SlotMitReservierung } from '../types';

export function SlotPicker({ appointmentId, onPick, onClose }: { appointmentId: string; onPick: (s: SlotMitReservierung) => void; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['slots', appointmentId], queryFn: () => api.slots(appointmentId) });
  const gruppen = new Map<string, SlotMitReservierung[]>();
  for (const s of data ?? []) gruppen.set(tag(s.startsAt), [...(gruppen.get(tag(s.startsAt)) ?? []), s]);
  return (
    <div className="slotpicker">
      <div className="slotpicker-kopf"><strong>Alle freien, passenden Slots</strong><button className="link" onClick={onClose}>schließen</button></div>
      {isLoading && <p>Lade …</p>}
      {data && data.length === 0 && <p>Keine freien Slots im Zeitfenster.</p>}
      {[...gruppen].map(([t, slots]) => (
        <div key={t} className="slot-tag">
          <div className="slot-tag-name">{t}</div>
          <div className="slots">
            {slots.map((s) => (
              <button key={s.practitionerId + s.startsAt} className="slot" onClick={() => onPick(s)}>
                <span><strong>{zeit(s.startsAt)}</strong> · {s.therapeutName} · {s.praxisName}</span>
                {s.gleicheUhrzeit && <span className="badge ok">✓ gleiche Uhrzeit</span>}
                {s.reserviertFuer && <span className="badge warn">Vorschlag für {s.reserviertFuer}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
