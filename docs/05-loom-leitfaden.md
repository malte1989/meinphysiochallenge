# Loom-Leitfaden

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [5 Loom](05-loom-leitfaden.md)



Maximal 5 Minuten. Die Notizen sind Stichpunkte zum Ablesen, nichts zum Vorlesen. Je Abschnitt stehen die Dateien, die dazu auf dem Bildschirm sein sollten.

## Vor der Aufnahme

1. `docker compose up --build -d --wait`, dann im Browser http://localhost:5173 öffnen und **Demo zurücksetzen** klicken ([README, Start](../README.md#start)).
2. Nicht-stören-Modus einschalten, Tabs vorbereiten: Oberfläche, [README](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), dieses Dokument.
3. Als Drehbuch: `cd e2e && npm run test:drehbuch` spielt den Komplettdurchlauf in Loom-Reihenfolge mit langsamen Klicks ab (etwa 45 Sekunden, [e2e/tests/loom-drehbuch.spec.ts](../e2e/tests/loom-drehbuch.spec.ts), Schritte 1 bis 11 entsprechen den Abschnitten unten). Mit `npm run test:ui` wählst du im Playwright-UI-Modus **einen einzelnen Schritt** (Tests „1 · Problem“ bis „11 · Notfallliste“, jeder startet mit zurückgesetzter Demo) oder den „0 · Komplettdurchlauf“. Tempo per `SLOW_MO` und `PAUSE` in Millisekunden.

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
**Dateien:** [01 Problem und Daten](01-problem-und-daten.md#problemerfassung), Oberfläche

- Montag, 07:40, Anna krank, der erste Termin ist um 08:00: Der Empfang hat Minuten, keine Stunden.
- Heute: Lücken, Qualifikation und Verordnungsfristen von Hand suchen. Ziel: Der Empfang telefoniert und bestätigt.

### 0:30–1:30 · Datenfallen
**Dateien:** [01 Problem und Daten](01-problem-und-daten.md#was-in-den-daten-steckt), [README, Was in den Daten steckt](../README.md#was-in-den-daten-steckt-per-code-geprüft)

- Zeiten sind UTC, Marek ist doppelt gebucht, Katrin Meier ist Meyer, Lena fehlt in den Stammdaten, Gisela hat keine Nummer.
- Haltung: Nichts still übergehen. Jeder Datenfehler wird sichtbar und, wo möglich, mit einem Klick behoben (Zusammenführen).

### 1:30–2:30 · Produktbrille
**Dateien:** [02 Produktbrille](02-produktbrille-und-technik.md#produktbrille-die-kernentscheidungen), [README, Priorisierung](../README.md#priorisierung-in-kurzform), [Spec §5](superpowers/specs/2026-09-30-der-ausfall-design.md)

- Zwei Reihenfolgen: Slots nach Priorität, Anrufe nach Dringlichkeit (Sabine um 08:00 zuerst).
- Harte Fristen vor „gefühlter“ Dringlichkeit: Cem und Renate, sonst verfällt die Verordnung. „Frisch operiert“ steht nicht in den Daten, die Diagnose ist nur Tie-Breaker.
- Slots werden gemeinsam verteilt, damit niemand denselben Slot bekommt. „✓ gleiche Uhrzeit“ bleibt erhalten (Kerstin).
- Ersatzlos absagbar, wenn der nächste Termin nah ist (Jan): spart knappe Kapazität.

### 2:30–3:30 · Live
**Dateien:** Oberfläche, [e2e/tests/faelle.spec.ts](../e2e/tests/faelle.spec.ts), [e2e/tests/loom-drehbuch.spec.ts](../e2e/tests/loom-drehbuch.spec.ts)

- Bestätigen bei Kerstin, dann Outbox zeigen. Die Datenbank verhindert Überschneidungen (Doppelklick ergibt 409).
- Zusammenführen bei Katrin.
- **Toggle 08:05** (Termino-Export von 08:00:41 auf 08:05:41, 1927 → 1928 Termine). Es ändern sich nur **drei Termine**, keiner gehört zu Annas Patient:innen:
  - Julia Conrad bei Sofia, Mi 09.09. 09:20: storniert, der Slot wird frei.
  - Helga Yildiz bei Tobias: von Di 08.09. 09:00 auf 13:40 verschoben, 09:00 wird frei, 13:40 belegt.
  - Georg Unger bei Jonas, Fr 11.09. 10:20: neu gebucht, der Slot wird belegt.
- **Was man sieht:** Keiner der 14 Vorschläge ändert sich, nur die **Alternativen** unter „Anderer Slot“:
  - Neu dabei: Di 08.09. 09:00 bei Tobias und Mi 09.09. 09:20 bei Sofia.
  - Weg: Di 08.09. 13:40 bei Tobias und Fr 11.09. 10:20 bei Jonas (bei manchen Fällen nur einer davon).
  - Für Cem (Frist 09.09.) ist der Mittwoch-Slot damit neu wählbar.
- **Was technisch passiert:** Der Export wird in einer Transaktion eingespielt. Nur Export-Termine werden angefasst, eigene Buchungen bleiben. Kollidiert ein Export-Termin mit einer eigenen Buchung, wird er übersprungen und als Konflikt gemeldet. Danach rechnet der Autopilot alles neu.
- **Ehrlich sagen:** Der Toggle ändert hier keinen Vorschlag und simuliert keine Selbstbuchung von Annas Patient:innen. Dafür gibt es den Button „Demo: Patient:in bucht selbst“ (nächster Stichpunkt). Idee für später: Meldung „Was hat sich geändert“ nach dem Umschalten.
- „Demo: Patient:in bucht selbst“ bei Cem: kein Anruf mehr nötig. Countdown und Auto-Refresh alle 5 Minuten.
- Krankmeldung verlängern: Geht es Anna mittags nicht besser, kommen ihre Termine von Dienstag dazu.
- „← Alle Ausfälle“: Übersicht aller Ausfälle auf einer eigenen Seite. Dort einen **neuen Ausfall** für eine andere Person anlegen (nur simuliert, kein Personalsystem, keine Benachrichtigung) und seine Fälle öffnen.

### 3:30–4:15 · Arbeit mit dem Agenten
**Dateien:** [02 Technik](02-produktbrille-und-technik.md#technik-und-umfang), [CLAUDE.md](../CLAUDE.md), [Spec](superpowers/specs/2026-09-30-der-ausfall-design.md), [Plan](superpowers/plans/2026-09-30-der-ausfall.md)

- Erst Problem und Daten, dann Design in Abschnitten mit meiner Freigabe, dann Spec und Plan, dann TDD in Worktrees.
- Wo ich dem Agenten widersprochen habe: Priorisierung, Termino-Schreibzugriff, Verlängern als Soll.
- Wo der Agent mir widersprochen hat: klinische Dringlichkeit, Fristen, Slots gemeinsam verteilen.
- Die Playwright-Fälle sind zugleich das Drehbuch.

### 4:15–5:00 · Annahmen, Weggelassenes, Skalierung
**Dateien:** [03 Architektur](03-architektur-annahmen.md), [README, Annahmen](../README.md#annahmen), [README, Bewusst weggelassen](../README.md#bewusst-weggelassen), [ARCHITECTURE.md](../ARCHITECTURE.md), [04 Todos](04-todos-und-naechste-schritte.md)

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

