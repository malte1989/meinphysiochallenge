# Der Ausfall: Autopilot für den Empfang

Case Study für meinphysio+. Am Montag, 07.09.2026, 07:40 meldet sich Anna Weber krank, 14 Termine an zwei Standorten. Diese Anwendung nimmt dem Empfang die Entscheidungen ab: Sie sagt, **wen man zuerst anruft**, **wohin man jede Person umbucht** und **wer ersatzlos absagbar ist**. Der Empfang telefoniert und bestätigt, er sucht keine Lücken mehr.

## Start

Voraussetzung: Docker mit Compose. Für die Tests zusätzlich Node 24 (`nvm use`).

```bash
docker compose up --build        # alles starten (db, api, web)
```

| Dienst | URL |
|---|---|
| Oberfläche | http://localhost:5173 |
| API | http://localhost:3000/api/health |
| Postgres (Host) | `postgres://ausfall:ausfall@localhost:5433/ausfall` |

Die Datenbank wird beim Start angelegt und aus `data/*.json` befüllt.

## Befehle

| Zweck | Befehl |
|---|---|
| Starten, im Hintergrund, wartet bis alles gesund ist | `docker compose up --build -d --wait` |
| Stoppen | `docker compose down` |
| Frisch von Grund auf (Datenbank löschen) | `docker compose down -v && docker compose up --build` |
| Logs der API | `docker compose logs -f api` |
| Demo zurücksetzen (oder Button in der Oberfläche) | `curl -X POST localhost:5173/api/sim/reset` |
| Unit-Tests (ohne Datenbank) | `cd api && npm ci && npm test` |
| Integrationstests | `docker compose up -d db`, dann `cd api && DATABASE_URL=postgres://ausfall:ausfall@localhost:5433/ausfall npm run test:int` |
| Typecheck api, Build web | `cd api && npm run typecheck` · `cd web && npm run build` |
| E2E (Stack muss laufen) | `cd e2e && npm ci && npx playwright install chromium && npm test` |
| E2E sichtbar und langsam (zum Aufnehmen) | `cd e2e && SLOW_MO=400 npm run test:headed` |
| E2E-Bericht mit Video und Trace | `cd e2e && npx playwright show-report` |
| Schwachstellen prüfen | `cd api && npm audit` (ebenso `web`, `e2e`) |

**Achtung:** Die Integrationstests löschen und befüllen die Datenbank des Compose-Stacks neu. Danach hilft **Demo zurücksetzen**.

## Das Problem in einem Satz

Unter Zeitdruck muss der Empfang für jeden Termin entscheiden (umbuchen, absagen, informieren) und sucht dafür von Hand Lücken, Qualifikationen und Verordnungsfristen zusammen.

## Was die Oberfläche tut

- **Anrufreihenfolge („Autopilot“)**: Termine, die in unter 60 Minuten beginnen, zuerst, danach nach Priorität. Alternativ nach **Uhrzeit** sortierbar.
- **Pro Fall** ein Vorschlag mit Begründung (Chips: Frist, Frequenz, nächster Termin) und bis zu zwei Alternativen. „✓ gleiche Uhrzeit“ wird ausgewiesen. Der Empfang bestätigt oder wählt aus allen freien Slots.
- **Kein Slot wird doppelt vorgeschlagen**: Die Slots werden über alle Fälle gemeinsam nach Priorität verteilt.
- **Bestätigen und Absagen** buchen über ein simuliertes Termino (mit Schutz vor Überschneidung) und erzeugen SMS und E-Mail in einer **Outbox** (nichts wird versendet).
- **Datenprobleme sind sichtbar**: Doppelbuchung, unsicherer Patient:innen-Treffer (mit **Zusammenführen**), fehlende Stammdaten, keine Telefonnummer.
- **Termino-Export 08:00 ↔ 08:05** schaltet zwischen den beiden Exporten um und simuliert neue Buchungen und Stornos. **Automatische Aktualisierung alle 5 Minuten** mit Countdown, dazu Button „Jetzt aktualisieren“.
- **Selbstbuchung** (Demo-Button „Patient:in bucht selbst“): Der Fall gilt als „✓ selbst gebucht, kein Anruf nötig“, auch nach „Absagen mit Link“.
- **Krankmeldung verlängern** (bis Di, Mi oder Fr): Annas Termine der Folgetage kommen als Fälle dazu, bestehende Entscheidungen bleiben.
- **Diagnosegruppen im Klartext** als Chip (z. B. „EX2 · Extremitäten“), Quellen und Prüfstatus im Tooltip ([data/diagnosegruppen.json](data/diagnosegruppen.json)).
- **Notfallliste** zum Drucken (`/#druck`), siehe [IT-Notfallkonzept](#it-notfallkonzept-entwurf-nicht-geübt).

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
4. **Klinische Dringlichkeit** (frisch operiert, Schmerz) steht nicht in den Daten. Harte Regeln sind nur die Verordnungsfristen und die Frequenz. Die Diagnosegruppe (EX3, LY2) wirkt nur als gekennzeichneter Tie-Breaker. Die Gruppenbezeichnung (WS, EX, LY) ist aus einer Zweitquelle belegt, die **Bedeutung der Ziffern ist nicht gegen den G-BA-Heilmittelkatalog geprüft** (siehe `verifikation` in `data/diagnosegruppen.json`).
5. **„Jetzt“ ist fest 07:40 Berliner Zeit** (konfigurierbar per `NOW`).
6. **SMS und E-Mail werden nur erzeugt.** Der Link zur Selbstbuchung ist ein Platzhalter.
7. **Ein Notfallkonzept für IT-Ausfälle existiert.** Die Anwendung liefert eine druckbare Notfallliste, der Rest ist ein ungeübter Entwurf (siehe unten).
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

## IT-Notfallkonzept (Entwurf, nicht geübt)

Annahme 7 sagt, dass ein Konzept existiert. Dieser Entwurf zeigt, wie sich die Anwendung darin einfügt.

| Szenario | Was der Empfang tut | Was die Anwendung dazu liefert |
|---|---|---|
| **Unser Service ist nicht erreichbar** | direkt in Termino arbeiten, Liste abtelefonieren | **Notfallliste** (Button „Notfallliste“ oder `/#druck`): druckbare Anrufliste in Anrufreihenfolge mit Kontakt, Empfehlung, Vorschlag und Hinweisen. Bei Ausfall sofort zum Ausfallzeitpunkt vorab drucken oder als PDF ablegen |
| **Termino ist nicht erreichbar** | Patient:innen nach Notfallliste anrufen, Buchungen auf Papier notieren | Die Liste zeigt den Stand des letzten Exports. Gebucht wird nach der Wiederherstellung |
| **Nach dem Ausfall** | Papiernotizen in Termino nachtragen, Nachrichten (SMS/E-Mail) bei Bedarf nachholen | Entscheidungen und Nachrichten sind in `ausfall.entscheidung` und `ausfall.outbox` protokolliert und dienen als Nachweis |
| **Rollback einer Fehlentscheidung** | Termin in Termino zurückbuchen, Patient:in informieren | **Nicht gebaut.** Jede Aktion ist protokolliert, eine „Rückgängig“-Funktion fehlt noch. **Demo zurücksetzen** gilt nur für die Demo |

Prävention (nicht umgesetzt): regelmäßige Datenbanksicherung, Health-Check mit Alarm, Notfallkontakt je Standort, halbjährliche Übung mit gedruckter Liste.

## CI und Security

- [.github/workflows/ci.yml](.github/workflows/ci.yml): API (Typecheck, Unit- und Integrationstests mit Postgres-Service), Web (Typecheck, Build), `npm audit --audit-level=high` für api, web und e2e, Secret-Scan mit gitleaks, E2E mit Playwright gegen `docker compose`, Berichte als Artefakt.
- [.github/dependabot.yml](.github/dependabot.yml): wöchentliche Updates für npm, Docker und GitHub Actions.
- **Stand ehrlich:** Die Pipeline ist **noch nie auf GitHub gelaufen** (nichts gepusht, kein Run). Lokal geprüft sind die YAML-Syntax, dass alle genannten npm-Skripte existieren und dass `npm audit`, Typecheck und Build sauber durchlaufen. Image-Scan (Trivy), Dockerfile-Lint (hadolint) und ein Accessibility-Check mit axe sind **nicht** eingebaut.

## Bewusst weggelassen

Echte Seite zur Selbstbuchung, echter Versand von SMS und E-Mail, Warteliste und Nachbelegung von Annas Slots, Authentifizierung, Mandanten im Code (nur [ARCHITECTURE.md](ARCHITECTURE.md)), vollständige Fehlerbehandlung, vollständige Testabdeckung.

## Wo ich abgebrochen habe

Der Kern ist fertig und getestet: 51 Unit-Tests, 17 Integrationstests und 18 Playwright-Fälle laufen grün (frischer Start mit `docker compose down -v && docker compose up --build`), `npm audit` meldet für `api`, `web` und `e2e` keine Schwachstellen.

Nicht erledigt oder nicht geprüft:
- Die **CI-Pipeline ist noch nie gelaufen** (siehe oben).
- Die **Ziffernbedeutung der Diagnosegruppen** und die ICD-10-Zuordnung sind nicht gegen die Primärquelle geprüft.
- Das **IT-Notfallkonzept** ist ein Entwurf, eine „Rückgängig“-Funktion fehlt.
- Die Oberfläche ist per Playwright und Screenshots geprüft, **nicht** mit Screenreader oder auf echten Mobilgeräten.
- Die **Anrufreihenfolge** ist nur grob dringlichkeitsgesteuert: Cem (09:00, in 80 Minuten) wird nach Renate (15:40) angerufen, weil das 60-Minuten-Fenster erst darunter greift.

## Nächste Schritte

1. **Authentifizierung und Rollen**: Kunde (Magic Link aus der SMS/E-Mail), Mitarbeiter (Empfang, Therapeut:in, Standortleitung, Anmeldung per OIDC mit Zwei-Faktor, Rolle pro Standort) und Admin (Benutzer, Regeln, Audit-Log). Das Token trägt Mandant und Rolle für die Row-Level-Security.
2. **CI zum Laufen bringen** (Repository auf GitHub, erster Lauf), dazu Image-Scan (Trivy), Dockerfile-Lint (hadolint) und Accessibility-Check mit axe in den Playwright-Tests.
3. **Diagnosegruppen** gegen den G-BA-Heilmittelkatalog prüfen (Ziffernbedeutung, ICD-10) und „Rückgängig“ für Entscheidungen und Buchungen.
4. **Design** an das meinphysio+-Buchungstool ([Terminanfrage](https://patient.meinphysioplus.de/terminanfrage)) angleichen (Farben, Schrift, Karten, Seitenleiste), nur Optik.
5. **Bruno-Requests** als Collection im Repo (`bruno/`) für alle Endpunkte (Fälle, Slots, Umbuchen, Absagen, Verknüpfen, Outbox, Sim), zum Ausprobieren und Demonstrieren der API.
6. **Stellschrauben für den Empfang**: Fenster der Anrufreihenfolge, Absage-Schwelle, Fristfenster.
7. Echte Termino-API statt Mock (Webhooks statt Polling), Warteliste und Nachbelegung von Annas frei gewordenen Slots, Kanalpräferenz und Opt-in der Patient:innen, echter Versand, Audit-Log, Kennzahlen (Zeit, bis alle informiert sind, Anteil erfolgreich umgebucht).

## Wie ich mit dem Agenten gearbeitet habe

- Agent-Instruktionen: [CLAUDE.md](CLAUDE.md). Planung und Entscheidungen: [docs/planungsphase.md](docs/planungsphase.md) (Übersicht der Einzeldokumente), Loom-Leitfaden: [docs/05-loom-leitfaden.md](docs/05-loom-leitfaden.md).
- Ablauf: Spec ([docs/superpowers/specs/](docs/superpowers/specs/)), Plan ([docs/superpowers/plans/](docs/superpowers/plans/)), dann TDD in Worktrees pro Feature, Review vor jedem Merge nach `develop`.
- Die vollständigen Prompts liegen im Session-Export.
- Die ursprüngliche Datenbeschreibung steht in [data/README.md](data/README.md).
