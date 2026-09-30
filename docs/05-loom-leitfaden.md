# Loom-Leitfaden

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [5 Loom](05-loom-leitfaden.md)



Maximal 5 Minuten. Die Notizen sind Stichpunkte zum Ablesen, nichts zum Vorlesen. Je Abschnitt stehen die Dateien, die dazu auf dem Bildschirm sein sollten.

## Vor der Aufnahme

1. `docker compose up --build -d --wait`, dann im Browser http://localhost:5173 öffnen und **Demo zurücksetzen** klicken ([README, Start](../README.md#start)).
2. Nicht-stören-Modus einschalten, Tabs vorbereiten: Oberfläche, [README](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), dieses Dokument.
3. Optional als Drehbuch: `cd e2e && SLOW_MO=400 npm run test:headed` ([e2e/tests/faelle.spec.ts](../e2e/tests/faelle.spec.ts)).

## Ablauf

| Zeit | Thema | Dateien auf dem Bildschirm |
|---|---|---|
| 0:00–0:30 | Problem | [01 Problem und Daten](01-problem-und-daten.md#problemerfassung), Oberfläche |
| 0:30–1:30 | Datenfallen | [01 Problem und Daten](01-problem-und-daten.md#was-in-den-daten-steckt), [README, Was in den Daten steckt](../README.md#was-in-den-daten-steckt-per-code-geprüft) |
| 1:30–2:30 | Produktbrille | [02 Produktbrille](02-produktbrille-und-technik.md#produktbrille-die-kernentscheidungen), [README, Priorisierung](../README.md#priorisierung-in-kurzform), [Spec §5](superpowers/specs/2026-09-30-der-ausfall-design.md) |
| 2:30–3:30 | Live | Oberfläche, [e2e/tests/faelle.spec.ts](../e2e/tests/faelle.spec.ts) |
| 3:30–4:15 | Arbeit mit dem Agenten | [02 Technik](02-produktbrille-und-technik.md#technik-und-umfang), [CLAUDE.md](../CLAUDE.md), [Spec](superpowers/specs/2026-09-30-der-ausfall-design.md), [Plan](superpowers/plans/2026-09-30-der-ausfall.md) |
| 4:15–5:00 | Annahmen, Weggelassenes, Skalierung | [03 Architektur](03-architektur-annahmen.md), [README, Annahmen](../README.md#annahmen), [README, Bewusst weggelassen](../README.md#bewusst-weggelassen), [ARCHITECTURE.md](../ARCHITECTURE.md), [04 Todos](04-todos-und-naechste-schritte.md) |

## Notizen je Abschnitt

### 0:00–0:30 · Problem
- Montag, 07:40, Anna krank, der erste Termin ist um 08:00: Der Empfang hat Minuten, keine Stunden.
- Heute: Lücken, Qualifikation und Verordnungsfristen von Hand suchen. Ziel: Der Empfang telefoniert und bestätigt.

### 0:30–1:30 · Datenfallen
- Zeiten sind UTC, Marek ist doppelt gebucht, Katrin Meier ist Meyer, Lena fehlt in den Stammdaten, Gisela hat keine Nummer.
- Haltung: Nichts still übergehen. Jeder Datenfehler wird sichtbar und, wo möglich, mit einem Klick behoben (Zusammenführen).

### 1:30–2:30 · Produktbrille
- Zwei Reihenfolgen: Slots nach Priorität, Anrufe nach Dringlichkeit (Sabine um 08:00 zuerst).
- Harte Fristen vor „gefühlter“ Dringlichkeit: Cem und Renate, sonst verfällt die Verordnung. „Frisch operiert“ steht nicht in den Daten, die Diagnose ist nur Tie-Breaker.
- Slots werden gemeinsam verteilt, damit niemand denselben Slot bekommt. „✓ gleiche Uhrzeit“ bleibt erhalten (Kerstin).
- Ersatzlos absagbar, wenn der nächste Termin nah ist (Jan): spart knappe Kapazität.

### 2:30–3:30 · Live
- Bestätigen bei Kerstin, dann Outbox zeigen. Die Datenbank verhindert Überschneidungen (Doppelklick ergibt 409).
- Zusammenführen bei Katrin. Toggle 08:05: Sofias Slot Mi 09:20 wird frei und erscheint für Cem.
- „Demo: Patient:in bucht selbst“ bei Cem: kein Anruf mehr nötig. Countdown und Auto-Refresh alle 5 Minuten.
- Krankmeldung verlängern: Geht es Anna mittags nicht besser, kommen ihre Termine von Dienstag dazu.

### 3:30–4:15 · Arbeit mit dem Agenten
- Erst Problem und Daten, dann Design in Abschnitten mit meiner Freigabe, dann Spec und Plan, dann TDD in Worktrees.
- Wo ich dem Agenten widersprochen habe: Priorisierung, Termino-Schreibzugriff, Verlängern als Soll.
- Wo der Agent mir widersprochen hat: klinische Dringlichkeit, Fristen, Slots gemeinsam verteilen.
- Die Playwright-Fälle sind zugleich das Drehbuch.

### 4:15–5:00 · Annahmen, Weggelassenes, Skalierung
- Wichtigste Annahme: Termino hat eine Schreib-API. Weggelassen: echter Versand, Selbstbuchungsseite, Warteliste, Auth.
- 100+ Praxen: gemeinsame DB mit `tenant_id` und Row-Level-Security, Adapter pro Buchungstool mit Inbox/Outbox, Autopilot zustandslos mit Regeln pro Mandant, Benachrichtigungsservice, DSGVO.
- Nächste Schritte: Authentifizierung für Kunde, Mitarbeiter und Admin, Nachbelegung, Opt-in, Kennzahlen.

## Loom-Abschnitt → Playwright-Test

| Loom | Test in [e2e/tests/faelle.spec.ts](../e2e/tests/faelle.spec.ts) |
|---|---|
| Problem | Überblick: 14 Fälle, Anrufreihenfolge … |
| Produktbrille | Frist: Cem und Renate …, Gleiche Uhrzeit: Kerstin …, Ersatzlos absagen: Jan …, Sortierung nach Uhrzeit |
| Datenfallen | Doppelbuchung: Marek …, Unsicherer Treffer: Katrin …, Stammdaten fehlen: Lena …, Keine Telefonnummer: Gisela … |
| Live | Toggle 08:05 …, Selbstbuchung …, Countdown …, Krankmeldung verlängern …, Doppelklick … |

