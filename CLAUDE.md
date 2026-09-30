# Der Ausfall: Arbeitsregeln für den Agent

## Kontext
Bewerbungs-Case für meinphysio+ (Case Study „Der Ausfall“, 3 Stunden, lokal). Am Mo 07.09.2026, 07:40 meldet sich Anna Weber krank, 14 Termine an zwei Standorten. Ein Service mit Oberfläche soll dem Empfang pro Termin einen begründeten, konfliktfreien Vorschlag und eine Anrufreihenfolge liefern. Maßgeblich sind `docs/superpowers/specs/2026-09-30-der-ausfall-design.md` und der Plan in `docs/superpowers/plans/`.

## Stack und Befehle
- TypeScript, Node 24 (`nvm use 24`), Fastify, `pg` (reines SQL), zod, Vitest, React + Vite + TanStack Query, Postgres 16.
- Start: `docker compose up --build` (web :5173, api :3000, db :5433 auf dem Host).
- E2E: `cd e2e && npm test` (Stack muss laufen, `docker compose up --build -d --wait`).
- Unit-Tests: `cd api && npm test`. DB-Tests: `cd api && DATABASE_URL=postgres://ausfall:ausfall@localhost:5433/ausfall npm run test:int`.

## Git
`main` ← `develop` ← `feature/*`. Setup direkt auf `develop`, danach ein Worktree pro Feature unter `.worktrees/<name>`. Vor jedem Merge: Tests grün und kurzes Review des Diffs, dann `git merge --no-ff` nach `develop`. Kein Push ohne Freigabe.

## Regeln
1. Aussagen kennzeichnen: [F] Fakt aus den Daten, [A] Annahme, [S] Schätzung, [Q] externe Quelle mit Link.
2. `data/*.json` nie ändern. Keine Zahlen erfinden, Quellen nur mit Link.
3. Zeiten in UTC speichern, in `Europe/Berlin` anzeigen. „Jetzt“ ist 2026-09-07T05:40:00Z.
4. TDD für `api/src/domain`: Test zuerst, Fehlschlag beobachten, dann implementieren.
5. UI-Texte auf Deutsch, Firmenname „meinphysio+“.
6. Keine echten Patientendaten in externe Tools (die Daten sind fiktiv).
7. Entscheidungen des Empfangs werden gespeichert, Vorschläge des Autopiloten nie.
