import { useEffect, useState } from 'react';

/** Zeigt, wann die nächste automatische Aktualisierung kommt (Termino liefert alle 5 Minuten einen Export). */
export function Countdown({ seit, intervallMs }: { seit: number; intervallMs: number }) {
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const rest = Math.max(0, Math.ceil((seit + intervallMs - jetzt) / 1000));
  return <span className="countdown">nächstes Update in {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')}</span>;
}
