# Der Ausfall: Autopilot für den Empfang

Case Study für meinphysio+. Am Montag, 07.09.2026, 07:40 meldet sich Anna Weber krank, 14 Termine an zwei Standorten. Diese Anwendung nimmt dem Empfang die Entscheidungen ab: Sie sagt, **wen man zuerst anruft**, **wohin man jede Person umbucht** und **wer ersatzlos absagbar ist**. Der Empfang telefoniert und bestätigt, er sucht keine Lücken mehr.

## Start

```bash
docker compose up --build
```

| Dienst | URL |
|---|---|
| Oberfläche | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| Postgres (Host) | `postgres://ausfall:ausfall@localhost:5433/ausfall` |

Die Datenbank wird beim Start automatisch angelegt und aus `data/*.json` befüllt. **Demo zurücksetzen** in der Oberfläche stellt den Ausgangszustand wieder her, damit sich jeder Fall beliebig oft vorführen lässt.

Tests (Node 24, `nvm use`):

```bash
cd api && npm test                                   # Unit-Tests, ohne Datenbank
docker compose up -d db
cd api && DATABASE_URL=postgres://ausfall:ausfall@localhost:5433/ausfall npm run test:int   # Integrationstests
```

**E2E mit Playwright** (gegen den laufenden Stack, 11 Fälle, je ein Test pro Fall aus dem Loom):

```bash
docker compose up --build -d --wait
cd e2e && npm ci && npx playwright install chromium
npm test                          # Videos und Traces in e2e/test-results, Bericht: npx playwright show-report
SLOW_MO=400 npm run test:headed   # langsam und sichtbar, z. B. zum Aufnehmen
```

## Das Problem in einem Satz

Unter Zeitdruck muss der Empfang für jeden Termin entscheiden (umbuchen, absagen, informieren) und sucht dafür von Hand Lücken, Qualifikationen und Verordnungsfristen zusammen.

## Was die Oberfläche tut

- **Anrufreihenfolge („Autopilot“)**: Termine, die in unter 60 Minuten beginnen, zuerst, danach nach Priorität. Alternativ nach **Uhrzeit** sortierbar.
- **Pro Fall** ein Vorschlag mit Begründung (Chips: Frist, Frequenz, nächster Termin) und bis zu zwei Alternativen. „✓ gleiche Uhrzeit“ wird ausgewiesen. Der Empfang bestätigt oder wählt aus allen freien Slots.
- **Kein Slot wird doppelt vorgeschlagen**: Die Slots werden über alle Fälle gemeinsam nach Priorität verteilt.
- **Bestätigen und Absagen** buchen über ein simuliertes Termino (mit Schutz vor Überschneidung) und erzeugen SMS und E-Mail in einer **Outbox** (nichts wird versendet).
- **Datenprobleme sind sichtbar**: Doppelbuchung, unsicherer Patient:innen-Treffer (mit **Zusammenführen**), fehlende Stammdaten, keine Telefonnummer.
- **Termino-Export 08:00 ↔ 08:05** schaltet zwischen den beiden Exporten um und simuliert neue Buchungen und Stornos. **Aktualisierung alle 5 Minuten** plus Button „Jetzt aktualisieren“.

## Was in den Daten steckt (per Code geprüft)

| # | Befund | Umgang |
|---|---|---|
| 1 | Alle Zeiten sind UTC (`06:00Z` = 08:00 Berlin) | Speichern in UTC, Anzeige in `Europe/Berlin` |
| 2 | Marek Kowalski hat zwei Termine am selben Tag, Verordnung 1×/Woche | Warnung „Doppelbuchung?“, der spätere Termin wird zur Stornierung empfohlen |
| 3 | „Katrin Meier“ (Termino) ist „Katrin Meyer“ in den Stammdaten, nicht verknüpft | „unsicherer Treffer“, per Klick zusammenführbar |
| 4 | Lena Krause fehlt in den Stammdaten | Warnung „Stammdaten fehlen“, keine Fristberechnung, wird zuletzt bedient |
| 5 | Cem Öztürk: Behandlungsbeginn bis 09.09., nächster Termin erst 10.09. | Stufe Frist, wird nie ersatzlos abgesagt |
| 6 | Renate Vogel: 14-Tage-Unterbrechungsfrist endet 09.09. | Stufe Frist |
| 7 | Gisela Neumann hat keine Telefonnummer | „nicht anrufbar“, nur E-Mail |
| 8 | Die Kalender sind voll. Brigittes 40-Minuten-Lymphdrainage hat im ganzen Fenster keinen Ersatz | Empfehlung „absagen mit Link“, in der Praxis Fall für die Standortleitung |
| 9 | 08:00 → 08:05: Ein Storno gibt Mi 09.09. 09:20 bei Sofia frei | Nach dem Umschalten wird dieser Slot für Cem angeboten |
| 10 | `prac_03` fehlt in `therapeuten.json`, „Lymphdrainage 45 Min.“ ist mit 40 Min. gebucht, Peter Albrecht war schon storniert (daher 14 statt 15 Termine) | nur Hinweis |

Fristen der Heilmittel-Richtlinie [Q]: Behandlungsbeginn innerhalb von 28 Tagen nach Ausstellung, Unterbrechung höchstens 14 Tage. Quellen: [AOK](https://www.aok.de/gp/heilmittel-richtlinie-vertragszahnaerzte/beginn-und-gueltigkeit-der-verordnung-neu-geregelt), [heilmittelkatalog.de](https://heilmittelkatalog.de/aenderungen/heilmittelrichtlinie-01-01-2021/).

## Annahmen

1. **Termino hat eine Schreib-API** (buchen, stornieren), hier gemockt. Ohne sie würde „Bestätigen“ nur eine Aufgabe anlegen. Nur der Adapter hinter `TerminoClient` ändert sich.
2. **Die Krankmeldung gilt für heute.** Der Zeitraum ist ein Parameter. Annas Slots ab Dienstag sind mögliche Ersatztermine.
3. **„Frontend in React“ ist eine SPA mit Vite.** Next.js wäre auch React. Im Team wäre das eine gemeinsame Architekturentscheidung.
4. **Klinische Dringlichkeit** (frisch operiert, Schmerz) steht nicht in den Daten. Harte Regeln sind nur die Verordnungsfristen und die Frequenz. Die Diagnosegruppe (EX3, LY2) wirkt nur als gekennzeichneter Tie-Breaker. Die Bedeutung der Kürzel ist nicht belegt.
5. **„Jetzt“ ist fest 07:40 Berliner Zeit** (konfigurierbar per `NOW`).
6. **SMS und E-Mail werden nur erzeugt.** Der Link zur Selbstbuchung ist ein Platzhalter.
7. **Ein Notfallkonzept für IT-Ausfälle existiert.** Eine druckbare Notfallliste ist nur als Idee vorgesehen.
8. **Stammdaten und Verordnungen sind bei uns führend**, Termino ist führend für Termine. Zusammenführen schreibt nur die Termino-ID in unsere Stammdaten.
9. **Selbst gebucht** heißt: ein neuer gebuchter Termin in Termino nach Anlage der Krankmeldung, nicht von uns angelegt.

## Priorisierung in Kurzform

- **Stufe Frist**: Verordnung verfällt innerhalb von 3 Tagen, wenn nicht behandelt wird.
- **Hoch**: 2× pro Woche oder Diagnose EX3/LY2 (Tie-Breaker).
- **Normal**: 1× pro Woche. **Prüfen**: Doppelbuchung oder fehlende Stammdaten.
- **Ersatzlos absagbar**: Der nächste Termin liegt höchstens 2 Tage entfernt und vor der Frist (Jan Ahrens). Dieser Fall verbraucht keinen Slot.
- **Slots**: passende Qualifikation, innerhalb der Arbeitszeit, ohne Überschneidung, frühestens 20 Minuten nach „jetzt“, nicht nach der Frist, nicht an Tagen mit anderem Termin der Person. Rang: gleiche Uhrzeit und Praxis, gleicher Tag und Praxis, gleicher Tag andere Praxis, spätere Tage. Innerhalb eines Rangs gewinnt die Uhrzeit, die dem Original am nächsten liegt.
- **Stellschrauben** (Konstanten): 60-Minuten-Fenster für die Anrufreihenfolge, Absage-Schwelle von 2 Tagen, Fristfenster von 3 Tagen.

Details und Begründungen: [docs/superpowers/specs/2026-09-30-der-ausfall-design.md](docs/superpowers/specs/2026-09-30-der-ausfall-design.md).

## Library-Wahl

| Wahl | Begründung |
|---|---|
| **Fastify** | schlank, gute TypeScript-Typen, schnell zu testen per `inject` |
| **`pg` mit reinem SQL** statt ORM | transparent, der Exclusion Constraint ist das Herzstück, keine Codegenerierung im Docker-Build |
| **zod** | Validierung der Eingaben, ein Fehlerpfad (400) |
| **Vitest** | schnell, TypeScript ohne Konfiguration |
| **Vite + React + TanStack Query** | `refetchInterval` liefert die 5-Minuten-Aktualisierung fast umsonst, Mutationen laden den Stand neu |
| **Intl statt Datumsbibliothek** | Zeitzone `Europe/Berlin` ohne zusätzliche Abhängigkeit |
| **Typen bewusst dupliziert** (api/web) | kein Shared-Package in 3 Stunden, nächster Schritt wäre ein generiertes OpenAPI-Schema |

## Bewusst weggelassen

Echte Seite zur Selbstbuchung, echter Versand von SMS und E-Mail, Warteliste und Nachbelegung von Annas Slots, Authentifizierung, Mandanten im Code (nur [ARCHITECTURE.md](ARCHITECTURE.md)), vollständige Fehlerbehandlung, vollständige Testabdeckung.

## Wo ich abgebrochen habe

Siehe Liste unten. Stand der Tests: 48 Unit-Tests, 12 Integrationstests und 11 Playwright-Fälle laufen grün. `npm audit` meldet für `api` und `web` keine Schwachstellen.

## Nächste Schritte

1. **Krankmeldung verlängern**, falls es Anna mittags nicht besser geht: Zeitraum erweitern, der Autopilot rechnet neu, bestehende Entscheidungen bleiben.
2. Button „Simuliere: Patient:in bucht selbst“ und Countdown bis zur nächsten Aktualisierung.
3. `data/diagnosegruppen.json` mit belegter Quelle und Klartext in den Chips.
4. Druckbare **Notfallliste** und Ausformulierung des IT-Notfallkonzepts (was tun, wenn unser Service oder Termino ausfällt).
5. **CI und Security**: GitHub Actions (Typecheck, Tests, `npm audit`, Secret-Scan), Dependabot, Image-Scan, Accessibility-Check mit axe.
6. Echte Termino-API, Warteliste, Kanalpräferenz und Opt-in der Patient:innen, Kennzahlen (Zeit, bis alle informiert sind, Anteil erfolgreich umgebucht).

## Wie ich mit dem Agenten gearbeitet habe

- Agent-Instruktionen: [CLAUDE.md](CLAUDE.md). Planung, Entscheidungen und Korrekturen: [docs/planungsphase.md](docs/planungsphase.md).
- Ablauf: Spec ([docs/superpowers/specs/](docs/superpowers/specs/)), Plan ([docs/superpowers/plans/](docs/superpowers/plans/)), dann TDD in Worktrees pro Feature, Review vor jedem Merge nach `develop`.
- Die vollständigen Prompts liegen im Session-Export.
- Die ursprüngliche Datenbeschreibung steht in [data/README.md](data/README.md).
