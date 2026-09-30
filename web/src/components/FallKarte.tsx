import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { LEISTUNG, PRAXIS, STUFE_LABEL, tag, tagZeit, zeit } from '../format';
import type { Diagnosegruppe, Fall, Slot } from '../types';
import { MatchVergleich } from './MatchVergleich';
import { SlotPicker } from './SlotPicker';

const EMPFEHLUNG: Record<Fall['empfehlung'], string> = {
  umbuchen: 'Umbuchen auf den Vorschlag',
  ersatzlos_absagen: 'Ersatzlos absagen vertretbar: nächster Termin folgt in Kürze',
  doppelbuchung_stornieren: 'Doppelbuchung: diesen Termin nach Rückfrage stornieren',
  absagen_mit_link: 'Niedrige Priorität: absagen, Patient:in bucht selbst neu',
  eskalieren: 'Kein Slot vor der Frist: Standortleitung um Vertretung bitten',
};
const STATUS: Record<Exclude<Fall['status'], 'offen'>, string> = {
  umgebucht: '✓ umgebucht', abgesagt: '✓ abgesagt', selbst_gebucht: '✓ selbst gebucht, kein Anruf nötig',
};

export function FallKarte({ fall, jetzt, diagnosen, onChanged, onHinweis }: { fall: Fall; jetzt: string; diagnosen?: Record<string, Diagnosegruppe>; onChanged: () => void; onHinweis: (t: string) => void }) {
  const [picker, setPicker] = useState(false);
  const a = fall.appointment;
  const tel = fall.patient?.telefon ?? a.patient.phone;
  const mail = fall.patient?.email ?? a.patient.email;
  const erledigt = fall.status !== 'offen';

  const fehler = (e: unknown) => {
    if (e instanceof ApiError && e.fehler === 'slot_belegt') onHinweis('Slot inzwischen belegt, Vorschläge wurden aktualisiert.');
    else if (e instanceof ApiError && e.fehler === 'bereits_entschieden') onHinweis('Dieser Fall wurde bereits entschieden.');
    else onHinweis('Aktion fehlgeschlagen.');
    onChanged();
  };
  const umbuchen = useMutation({ mutationFn: (s: Slot) => api.umbuchen(a.id, s.practitionerId, s.startsAt), onSuccess: onChanged, onError: fehler });
  const absagen = useMutation({ mutationFn: (art: 'mit_link' | 'ersatzlos' | 'doppelbuchung') => api.absagen(a.id, art), onSuccess: onChanged, onError: fehler });
  const selbst = useMutation({ mutationFn: () => api.selbstbuchung(a.id), onSuccess: onChanged, onError: fehler });
  const verknuepfen = useMutation({ mutationFn: () => api.verknuepfen(fall.patient!.id, a.patient.id), onSuccess: onChanged, onError: fehler });
  const busy = umbuchen.isPending || absagen.isPending || verknuepfen.isPending || selbst.isPending;

  return (
    <article className={`karte stufe-${fall.stufe}${erledigt ? ' erledigt' : ''}`} data-testid="fall" data-patient={a.patient.name}>
      <header className="karte-kopf">
        <span className={`stufe-badge stufe-${fall.stufe}`}>{STUFE_LABEL[fall.stufe]}</span>
        {tag(a.startsAt) !== tag(jetzt) && <strong className="tag">{tag(a.startsAt)}</strong>}
        <strong className="uhrzeit">{zeit(a.startsAt)}</strong>
        <span>{PRAXIS[a.locationId] ?? a.locationId}</span>
        <span>{LEISTUNG[fall.heilmittel] ?? fall.heilmittel} · {a.durationMin} Min</span>
        {!erledigt && <span className="bis">{fall.minutenBisStart > 0 ? `in ${fall.minutenBisStart} Min` : 'läuft'}</span>}
      </header>
      <div className="person">
        <strong>{a.patient.name}</strong>
        {tel ? <a href={`tel:${tel.replace(/\s/g, '')}`}>☎ {tel}</a> : <span className="warn-text">☎ keine Nummer</span>}
        {mail && <span>✉ {mail}</span>}
      </div>
      <div className="chips">
        {fall.verordnung && (() => {
          const d = diagnosen?.[fall.verordnung.diagnosegruppe];
          const titel = d ? `${d.bezeichnung}. ${d.ziffer_hinweis ?? 'Bedeutung der Ziffer nicht belegt.'} ${d.hinweis} Quellen: ${d.quellen.join(' ')}` : undefined;
          return <span className="chip diagnose" title={titel}>{fall.verordnung.diagnosegruppe}{d ? ` · ${d.kurz}` : ''}</span>;
        })()}
        {fall.gruende.map((g) => <span key={g} className="chip">{g}</span>)}
        {fall.warnungen.map((w) => <span key={w.code} className={`chip warnung ${w.code}`} title={w.text}>⚠ {w.text}</span>)}
      </div>

      {erledigt ? (
        <div className="status">{STATUS[fall.status as Exclude<Fall['status'], 'offen'>]}</div>
      ) : (
        <>
          <p className="empfehlung">{EMPFEHLUNG[fall.empfehlung]}</p>
          {fall.vorschlag && (
            <p className="vorschlag">
              Vorschlag: <strong>{tagZeit(fall.vorschlag.startsAt)}</strong> · {fall.vorschlag.therapeutName} · {fall.vorschlag.praxisName}
              {fall.vorschlag.gleicheUhrzeit && <span className="badge ok"> ✓ gleiche Uhrzeit</span>}
            </p>
          )}
          {fall.match === 'unsicher' && <MatchVergleich fall={fall} busy={busy} onZusammenfuehren={() => verknuepfen.mutate()} />}
          <div className="aktionen">
            {fall.vorschlag && fall.empfehlung !== 'ersatzlos_absagen' && (
              <button className="primary" disabled={busy} onClick={() => umbuchen.mutate(fall.vorschlag!)}>Bestätigen</button>
            )}
            {fall.empfehlung === 'ersatzlos_absagen' && <button className="primary" disabled={busy} onClick={() => absagen.mutate('ersatzlos')}>Ersatzlos absagen</button>}
            {fall.empfehlung === 'doppelbuchung_stornieren' && <button className="primary" disabled={busy} onClick={() => absagen.mutate('doppelbuchung')}>Doppelbuchung stornieren</button>}
            {fall.empfehlung !== 'doppelbuchung_stornieren' && <button disabled={busy} onClick={() => setPicker(!picker)}>Anderer Slot ▾</button>}
            {fall.empfehlung !== 'doppelbuchung_stornieren' && fall.empfehlung !== 'ersatzlos_absagen' && (
              <button disabled={busy} onClick={() => absagen.mutate('mit_link')}>Absagen mit Link</button>
            )}
            <button className="link" disabled={busy} onClick={() => selbst.mutate()}>Demo: Patient:in bucht selbst</button>
          </div>
          {picker && <SlotPicker appointmentId={a.id} onClose={() => setPicker(false)} onPick={(s) => { setPicker(false); umbuchen.mutate(s); }} />}
        </>
      )}
    </article>
  );
}
