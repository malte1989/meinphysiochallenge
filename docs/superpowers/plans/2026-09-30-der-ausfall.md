# Der Ausfall: Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Service mit React-Oberfläche, der dem Empfang bei Annas Krankmeldung (Mo 07.09.2026) für jeden der 14 Termine einen begründeten, konfliktfreien Vorschlag und eine Anrufreihenfolge liefert.

**Architecture:** Monorepo mit `api/` (Fastify, `pg`, reines SQL), `web/` (Vite + React + TanStack Query) und `db` (Postgres 16), gestartet über `docker compose up`. Der Autopilot ist eine reine Funktion über geladene Daten. Nur der `TerminoClient` (heute ein Mock im Schema `termino`) schreibt Termine, Überschneidungen verhindert ein Exclusion Constraint.

**Tech Stack:** TypeScript 5, Node 24 (Container `node:24-alpine` und Host über nvm, `.nvmrc`), Fastify 5, pg 8, zod 3, Vitest 2, React 18, Vite 5, @tanstack/react-query 5, Postgres 16 (btree_gist).

**Spec:** `docs/superpowers/specs/2026-09-30-der-ausfall-design.md`

## Voraussetzung (vor Task 1)

- Node 24 auf dem Host: `nvm use 24` (die nvm-Voreinstellung ist 20.14). Agents nutzen `PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH`.
- Docker: Die CLI ist über Homebrew installiert (29.8.1). **Es fehlen das Compose-Plugin und ein Daemon.** Vor Task 1 müssen `docker compose version` und `docker info` funktionieren.
- Postgres 15 (Homebrew) ist lokal vorhanden, wird aber nicht gebraucht. Die DB läuft als `postgres:16-alpine` im Compose.
- Unit-Tests laufen ohne Docker mit Node auf dem Host.

## Global Constraints

- Zeitzone: Die Datenbank speichert UTC (`timestamptz`). Anzeige und Tageslogik laufen in `Europe/Berlin`.
- „Jetzt“ ist fest `2026-09-07T05:40:00Z` (07:40 Berlin), überschreibbar per ENV `NOW`.
- Ausfall (Seed): Therapeut:in Anna Weber `2a3bbf28-bd84-438e-91ca-604f8cd93fb2` (Termino `prac_01`), `von = 2026-09-06T22:00:00Z`, `bis = 2026-09-07T22:00:00Z`, `created_at = 2026-09-07T05:40:00Z`.
- Ende des Exportfensters: `2026-09-13` (Berliner Datum, inklusive).
- `ABSAGE_TAGE = 2`. Vorlauf für Slots: `jetzt + 20 Min`. Slot-Raster: 20 Min ab Beginn des Arbeitsblocks. Die Dauer entspricht der des Originaltermins.
- Fristen: `Ausstellung + 28 T` (wenn noch keine Behandlung), `letzte Behandlung + 14 T`. Stufe 🔴, wenn `Frist ≤ jetzt-Datum + 3 T`.
- Mapping der Leistungen: `Krankengymnastik→KG`, `Manuelle Therapie→MT`, `Lymphdrainage 45 Min.→MLD45`, `Geraetegestuetzte Krankengymnastik→KGG`.
- `data/*.json` bleibt unverändert und wird im Container read-only unter `/data` gemountet.
- UI-Texte und Nachrichten auf Deutsch. Der Firmenname wird „meinphysio+“ geschrieben. Selbstbuchungs-Link als Platzhalter `https://termino.example/buchen?patient=<termino_patient_id>`.
- Ports: web `5173`, api `3000`, db auf dem Host `5433` (Container `5432`). DB-URL auf dem Host: `postgres://ausfall:ausfall@localhost:5433/ausfall`.
- Git: Task 1 direkt auf `develop`. Ab Task 2 ein Worktree pro Feature unter `.worktrees/<name>` auf `feature/<name>`. Vor jedem Merge laufen die Tests, dazu kommt ein kurzes Review des Diffs, dann `git merge --no-ff` nach `develop`. Kein Push ohne Freigabe.

## Review Focus

1. **Doppelklick oder zwei Empfangsplätze bestätigen denselben Fall:** Der zweite Aufruf muss 409 `bereits_entschieden` liefern und darf keine zweite Buchung oder Outbox-Nachricht erzeugen → Test in Task 7.
2. **Toggle zurück auf 08:00, nachdem der frei gewordene Slot (Mi 09.09. 09:20, Sofia) schon für Cem gebucht wurde:** Das muss als Konflikt gemeldet werden, ohne Absturz, und Cems Buchung bleibt erhalten → Test in Task 2.
3. **Vorlauf rund um „jetzt“:** Kein Slot vor 08:00 am 07.09. Außerdem liegen Slots in Berliner Wandzeit (08:00 Berlin = 06:00Z) → Test in Task 5.
4. **Patient:in ohne Telefonnummer (Gisela Neumann):** keine SMS, nur E-Mail. Ohne beides erscheint die Warnung „nicht erreichbar“ → Test in Task 7.
5. **Erledigte Fälle** (umgebucht oder abgesagt) reservieren keine Slots mehr und stehen in der Anrufreihenfolge hinten → Test in Task 6.

---

## Dateistruktur

```
docker-compose.yml             db, api, web; ./data → /data:ro
.gitignore                     node_modules, dist, .worktrees
CLAUDE.md                      Arbeitsregeln des Agents in diesem Repo
README.md · ARCHITECTURE.md    Abgabedokumente (Task 9)
api/
  Dockerfile · package.json · tsconfig.json · vitest.config.ts
  src/server.ts                Fastify-Bootstrap, migrate+seed, Routen registrieren
  src/config.ts                ENV → Config (DATABASE_URL, NOW, DATA_DIR, ABSAGE_TAGE)
  src/db/pool.ts               pg Pool
  src/db/schema.sql            DDL der drei Schemas (idempotent)
  src/db/migrate.ts            schema.sql ausführen
  src/db/seed.ts               JSON → stamm/termino, Snapshots, Ausfall
  src/domain/types.ts          Domänentypen (siehe Task 3)
  src/domain/time.ts           Berlin-Zeit-Helfer
  src/domain/heilmittel.ts     Mapping der Leistungen
  src/domain/matching.ts       Patient-Matching
  src/domain/enrich.ts         Fälle bestimmen und anreichern
  src/domain/priority.ts       Stufe, Score, Grund-Chips, Vor-Empfehlung
  src/domain/slots.ts          freie Slots
  src/domain/autopilot.ts      Komposition + Verteilung + Anrufreihenfolge
  src/termino/client.ts        TerminoClient-Interface, ConflictError
  src/termino/mock.ts          MockTerminoClient (pg)
  src/termino/snapshot.ts      applySnapshot (Toggle)
  src/outbox/messages.ts       Vorlagen → Nachrichten (rein)
  src/repo/load.ts             AutopilotInput aus der DB laden
  src/routes/*.ts              ausfall, faelle, patienten, outbox, sim
  test/fixtures.ts             AutopilotInput aus ../data/*.json (ohne DB)
  test/*.test.ts               Unit-Tests · test/*.int.test.ts DB-Tests
web/
  Dockerfile · package.json · tsconfig.json · vite.config.ts · index.html
  src/main.tsx · App.tsx · api.ts · types.ts · format.ts · styles.css
  src/components/Header.tsx · FallKarte.tsx · SlotPicker.tsx · MatchVergleich.tsx · OutboxDrawer.tsx
```

---

### Task 1: Grundsetup auf `develop` (Compose, Schema, Seed, Grundgerüst, CLAUDE.md)

**Files:**
- Create: `docker-compose.yml`, `.gitignore`, `.nvmrc`, `CLAUDE.md`, `api/{Dockerfile,package.json,tsconfig.json,vitest.config.ts}`, `api/src/{server.ts,config.ts}`, `api/src/db/{pool.ts,schema.sql,migrate.ts,seed.ts}`, `web/{Dockerfile,package.json,tsconfig.json,vite.config.ts,index.html}`, `web/src/{main.tsx,App.tsx}`
- Test: `api/test/seed.int.test.ts`

**Interfaces:**
- Produces: `GET /api/health → {ok: true}`; `pool` (`api/src/db/pool.ts`); `config: {databaseUrl: string; now: string; dataDir: string; absageTage: number; exportFensterBis: string}`; `migrate(): Promise<void>`; `seed(): Promise<void>`.
- Produces (Schema, exakt):
  - `stamm.praxis(id uuid pk, name, adresse, termino_location_id text unique)`
  - `stamm.therapeut(id uuid pk, vorname, nachname, qualifikationen text[], termino_practitioner_id text unique)`
  - `stamm.arbeitszeit(therapeut_id, wochentag int 1–5, praxis_id, von time, bis time)`
  - `stamm.patient(id uuid pk, vorname, nachname, geburtsdatum date, telefon, email, termino_patient_id text unique null)`
  - `stamm.verordnung(id uuid pk, patient_id, ausstellungsdatum date, diagnosegruppe, heilmittel, verordnungsmenge int, frequenz_pro_woche int)`
  - `termino.appointment(id text pk, location_id, practitioner_id, service, starts_at timestamptz, ends_at timestamptz, duration_min int, status text check in ('booked','cancelled'), patient jsonb, booked_at timestamptz, updated_at timestamptz, source text check in ('export','api','patient'))` mit `EXCLUDE USING gist (practitioner_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'booked')`
  - `termino.export_snapshot(stand text pk check in ('0800','0805'), exported_at timestamptz, payload jsonb)`
  - `termino.sim_state(id int pk default 1, stand text)`
  - `ausfall.ausfall(id uuid pk, therapeut_id, von timestamptz, bis timestamptz, created_at timestamptz)`
  - `ausfall.entscheidung(appointment_id text pk, aktion text, neuer_termin_id text null, created_at timestamptz)`
  - `ausfall.outbox(id serial pk, appointment_id, kanal text check in ('sms','email'), empfaenger, betreff null, text, created_at timestamptz)`

- [ ] **Step 1:** Führe `git checkout develop` aus und lege dann `.gitignore` an (`node_modules/`, `dist/`, `.worktrees/`, `*.log`).
- [ ] **Step 2:** `CLAUDE.md` schreiben: Projektkontext (3 Sätze aus Spec §1), Stack, Befehle (`docker compose up`, `cd api && npm test`, `npm run test:int`), Git-Ablauf aus den Global Constraints, Regeln (Kennzeichnung [F]/[A]/[S], `data/` nie ändern, Zeiten in UTC speichern und in Berlin anzeigen, Deutsch in der UI, TDD für `api/src/domain`, keine echten Patientendaten in externe Tools).
- [ ] **Step 3:** `docker-compose.yml` anlegen: `db` (postgres:16-alpine, user/pw/db `ausfall`, Healthcheck `pg_isready`, Port `5433:5432`), `api` (build `./api`, ENV `DATABASE_URL=postgres://ausfall:ausfall@db:5432/ausfall`, `DATA_DIR=/data`, Volume `./data:/data:ro`, `depends_on: db: condition: service_healthy`, Port 3000), `web` (build `./web`, ENV `API_URL=http://api:3000`, Port 5173, `depends_on: api`).
- [ ] **Step 4:** `api/` aufsetzen: package.json-Skripte `start` (`tsx src/server.ts`), `test` (`vitest run --exclude '**/*.int.test.ts'`), `test:int` (`vitest run int.test`). Dependencies `fastify pg zod tsx`, dev `typescript vitest @types/pg @types/node`. Dockerfile `node:24-alpine`, `npm ci`, `CMD npm start`. `.nvmrc` im Repo-Root mit `24`.
- [ ] **Step 5:** `schema.sql` wie im Interface oben (`CREATE SCHEMA/TABLE IF NOT EXISTS`, `CREATE EXTENSION IF NOT EXISTS btree_gist`). `migrate()` führt die Datei aus.
- [ ] **Step 6: Failing Test schreiben** in `api/test/seed.int.test.ts` (braucht `DATABASE_URL`, sonst `describe.skip`):

```ts
test('seed lädt Stammdaten, Export 08:00 und Annas Ausfall idempotent', async () => {
  await migrate(); await seed(); await seed();
  expect(await count('stamm.patient')).toBe(560);
  expect(await count('stamm.therapeut')).toBe(7);
  expect(await count('termino.appointment')).toBe(1927);
  expect(await count('termino.export_snapshot')).toBe(2);
  expect((await q("select stand from termino.sim_state")).rows[0].stand).toBe('0800');
  expect(await count('ausfall.ausfall')).toBe(1);
  const r = await q("select count(*)::int n from termino.appointment where practitioner_id='prac_01' and status='booked' and starts_at >= '2026-09-06T22:00Z' and starts_at < '2026-09-07T22:00Z'");
  expect(r.rows[0].n).toBe(14);
});
```

- [ ] **Step 7:** `docker compose up -d db` starten, dann `cd api && DATABASE_URL=postgres://ausfall:ausfall@localhost:5433/ausfall npm run test:int`. Erwartung: FAIL (seed fehlt).
- [ ] **Step 8:** `seed()` implementieren. Jeder Block läuft nur, wenn die Zieltabelle leer ist. Aus `arbeitszeiten` wird `stamm.arbeitszeit` (`mo..fr` → 1..5). Beide Exporte kommen roh nach `export_snapshot`. Die Termine aus `0800` werden mit `source='export'` eingefügt, `ends_at = starts_at + duration_min`. `sim_state.stand='0800'`. Der Ausfall wird mit den Werten aus den Global Constraints angelegt. `server.ts` ruft `migrate()` und `seed()` vor `listen({host:'0.0.0.0', port:3000})` auf.
- [ ] **Step 9:** Test erneut ausführen. Erwartung: PASS.
- [ ] **Step 10:** `web/` aufsetzen: Vite React TS, `vite.config.ts` mit `server: {host: true, port: 5173, proxy: {'/api': process.env.API_URL ?? 'http://localhost:3000'}}`. `App.tsx` zeigt das Ergebnis von `GET /api/health`. Dockerfile `node:24-alpine`, `CMD npm run dev`.
- [ ] **Step 11:** Smoke-Test: `docker compose up --build`. Unter `http://localhost:5173` erscheint „ok“, `curl localhost:3000/api/health` liefert `{"ok":true}`.
- [ ] **Step 12:** Committen auf `develop`: `chore: Grundsetup – Compose, Schema, Seed, Web-Grundgerüst, CLAUDE.md`

---

### Task 2: Termino-Mock und Export-Toggle (Worktree `feature/termino-mock`)

**Files:**
- Create: `api/src/termino/client.ts`, `api/src/termino/mock.ts`, `api/src/termino/snapshot.ts`
- Test: `api/test/termino.int.test.ts`

**Interfaces:**
- Consumes: Schema und `pool` aus Task 1, `Appointment` aus Task 3 (bei paralleler Arbeit: vorläufig in `client.ts` definieren und in Task 3 nach `types.ts` verschieben).
- Produces:
  - `interface TerminoClient { listAppointments(): Promise<Appointment[]>; book(a: NewAppointment): Promise<Appointment>; cancel(id: string, at: string): Promise<void> }`
  - `type NewAppointment = Omit<Appointment,'id'|'status'|'bookedAt'|'updatedAt'> & {at: string}`
  - `class ConflictError extends Error {}` (wird bei SQLSTATE `23P01` geworfen)
  - `class MockTerminoClient implements TerminoClient { constructor(pool: Pool) }`. Neue IDs haben die Form `apt_api_<8 hex>`.
  - `applySnapshot(pool, stand: '0800'|'0805'): Promise<{stand; konflikte: string[]}>`

- [ ] **Step 1:** Lege den Worktree mit `git worktree add .worktrees/termino-mock -b feature/termino-mock develop` an.
- [ ] **Step 2: Failing Tests schreiben** in `termino.int.test.ts` (vor jedem Test Reset über truncate plus seed):

```ts
test('book lehnt Überschneidung mit ConflictError ab', async () => {
  // Jonas (prac_02) hat am 07.09. 08:00 Berlin einen Termin
  await expect(client.book({...base, practitionerId:'prac_02', startsAt:'2026-09-07T06:00:00Z', durationMin:20, at: NOW}))
    .rejects.toBeInstanceOf(ConflictError);
});
test('book in freie Lücke klappt, cancel setzt status', async () => {
  const a = await client.book({...base, practitionerId:'prac_02', startsAt:'2026-09-07T07:20:00Z', durationMin:20, at: NOW});
  expect(a.id).toMatch(/^apt_api_/); expect(a.source).toBe('api');
  await client.cancel(a.id, NOW);
  expect((await byId(a.id)).status).toBe('cancelled');
});
test('Toggle 0805 spielt Diff ein, 0800 nimmt ihn zurück', async () => {
  expect((await applySnapshot(pool,'0805')).konflikte).toEqual([]);
  expect((await byId('apt_004498')).status).toBe('cancelled');
  expect(await byId('apt_006783')).toBeDefined();
  await applySnapshot(pool,'0800');
  expect((await byId('apt_004498')).status).toBe('booked');
  expect(await byId('apt_006783')).toBeUndefined();
});
test('Toggle zurück kollidiert mit eigener Buchung → Konflikt, Buchung bleibt', async () => {
  await applySnapshot(pool,'0805');
  const cem = await client.book({...base, practitionerId:'prac_04', startsAt:'2026-09-09T07:20:00Z', durationMin:20, at: NOW});
  const r = await applySnapshot(pool,'0800');
  expect(r.konflikte).toEqual(['apt_004498']);
  expect((await byId(cem.id)).status).toBe('booked');
});
```

- [ ] **Step 3:** Die Tests ausführen, Erwartung: FAIL.
- [ ] **Step 4:** `MockTerminoClient` und `applySnapshot` implementieren. `applySnapshot` arbeitet in einer Transaktion, mit einem Savepoint pro geänderter Zeile. Nur Zeilen mit `source='export'` werden angefasst. Export-Zeilen, die im Ziel-Snapshot fehlen, werden gelöscht. Upsert per `ON CONFLICT (id) DO UPDATE … WHERE appointment.source='export'`. Bei `23P01` wird die ID in `konflikte` aufgenommen, dann folgt Rollback zum Savepoint. Am Ende wird `sim_state` gesetzt.
- [ ] **Step 5:** Die Tests ausführen, Erwartung: PASS.
- [ ] **Step 6:** Committen mit `feat: Termino-Mock mit Überschneidungsschutz und Export-Toggle`, danach Review des Diffs und `git merge --no-ff` nach `develop`. Der Worktree wird entfernt.

---

### Task 3: Domänentypen, Zeit, Mapping, Patient-Matching (Worktree `feature/autopilot`, Tasks 3–6)

**Files:**
- Create: `api/src/domain/{types.ts,time.ts,heilmittel.ts,matching.ts}`, `api/test/fixtures.ts`
- Test: `api/test/time.test.ts`, `api/test/matching.test.ts`

**Interfaces:**
- Produces (`types.ts`, verbindlich für alle Folgetasks):

```ts
export type Heilmittel = 'KG'|'MT'|'MLD45'|'KGG';
export interface Praxis { id: string; name: string; terminoLocationId: string }
export interface Therapeut { id: string; vorname: string; nachname: string; qualifikationen: Heilmittel[]; terminoPractitionerId: string }
export interface Arbeitszeit { therapeutId: string; wochentag: 1|2|3|4|5; praxisId: string; von: string; bis: string } // 'HH:MM' Berlin
export interface Patient { id: string; vorname: string; nachname: string; geburtsdatum: string; telefon: string|null; email: string|null; terminoPatientId: string|null }
export interface Verordnung { id: string; patientId: string; ausstellungsdatum: string; diagnosegruppe: string; heilmittel: Heilmittel; verordnungsmenge: number; frequenzProWoche: number }
export interface TerminoPatient { id: string; name: string; birth_date: string; phone: string|null; email: string|null }
export interface Appointment { id: string; locationId: string; practitionerId: string; service: string; startsAt: string; durationMin: number; status: 'booked'|'cancelled'; patient: TerminoPatient; bookedAt: string; updatedAt: string; source: 'export'|'api'|'patient' }
export interface Ausfall { id: string; therapeutId: string; von: string; bis: string; createdAt: string }
export type Aktion = 'umgebucht'|'abgesagt_mit_link'|'ersatzlos_abgesagt'|'doppelbuchung_storniert';
export interface Entscheidung { appointmentId: string; aktion: Aktion; neuerTerminId: string|null; createdAt: string }
export interface AutopilotInput { jetzt: string; ausfall: Ausfall; appointments: Appointment[]; patienten: Patient[]; verordnungen: Verordnung[]; therapeuten: Therapeut[]; arbeitszeiten: Arbeitszeit[]; praxen: Praxis[]; entscheidungen: Entscheidung[]; exportFensterBis: string; absageTage: number }
export type MatchArt = 'exakt'|'unsicher'|'fehlt';
export type Stufe = 'frist'|'hoch'|'normal'|'pruefen';
export type Empfehlung = 'umbuchen'|'ersatzlos_absagen'|'doppelbuchung_stornieren'|'absagen_mit_link'|'eskalieren';
export type WarnCode = 'doppelbuchung'|'identitaet_pruefen'|'stammdaten_fehlen'|'nicht_anrufbar'|'nicht_erreichbar';
export interface Warnung { code: WarnCode; text: string }
export interface Slot { practitionerId: string; therapeutName: string; praxisId: string; praxisName: string; locationId: string; startsAt: string; endsAt: string; rang: 1|2|3|4; gleicheUhrzeit: boolean }
export type FallStatus = 'offen'|'umgebucht'|'abgesagt'|'selbst_gebucht';
export interface Fall {
  appointment: Appointment; patient: Patient|null; match: MatchArt; verordnung: Verordnung|null; heilmittel: Heilmittel;
  frist: string|null; fristGrund: 'beginn'|'unterbrechung'|null; letzteBehandlung: string|null; naechsterTermin: Appointment|null;
  stufe: Stufe; score: number; gruende: string[]; warnungen: Warnung[]; empfehlung: Empfehlung;
  vorschlag: Slot|null; alternativen: Slot[]; status: FallStatus; minutenBisStart: number; anrufRang: number;
}
```

- Produces (`time.ts`): `berlinDate(iso: string): string` ('YYYY-MM-DD'), `berlinTime(iso): string` ('HH:MM'), `berlinWeekday(date: string): 0..6`, `berlinWallToUtc(date: string, hhmm: string): string` (ISO), `addDays(date: string, n: number): string`, `daysBetween(a: string, b: string): number`. Umsetzung über `Intl.DateTimeFormat` mit `timeZone:'Europe/Berlin'`, ohne weitere Library.
- Produces (`heilmittel.ts`): `serviceToHeilmittel(service: string): Heilmittel` (wirft bei unbekannter Leistung).
- Produces (`matching.ts`): `matchPatient(tp: TerminoPatient, patienten: Patient[]): {art: MatchArt; patient: Patient|null}`. Exakt über `terminoPatientId`. Sonst unsicher bei gleichem Geburtsdatum und (Telefon gleich oder E-Mail gleich oder Levenshtein(Nachname) ≤ 2). Sonst fehlt.
- Produces (`test/fixtures.ts`): `loadFixtureInput(stand: '0800'|'0805' = '0805'): AutopilotInput`. Liest `../data/*.json` und mappt snake_case auf die Typen. Die Werte für jetzt, Ausfall, Fenster und absageTage kommen aus den Global Constraints. `entscheidungen: []`.

- [ ] **Step 1:** Lege den Worktree mit `git worktree add .worktrees/autopilot -b feature/autopilot develop` an.
- [ ] **Step 2: Failing Tests schreiben:**

```ts
// time.test.ts
expect(berlinWallToUtc('2026-09-07','08:00')).toBe('2026-09-07T06:00:00.000Z');
expect(berlinDate('2026-09-06T22:30:00Z')).toBe('2026-09-07');
expect(berlinTime('2026-09-07T06:00:00Z')).toBe('08:00');
expect(addDays('2026-08-12', 28)).toBe('2026-09-09');
expect(daysBetween('2026-09-07','2026-09-09')).toBe(2);
expect(berlinWeekday('2026-09-07')).toBe(1);
// matching.test.ts (mit loadFixtureInput)
expect(matchPatient(tp('pat_02026'), p).art).toBe('exakt');           // Sabine Czerny
const km = matchPatient(tp('pat_02538'), p);                           // Katrin Meier
expect(km.art).toBe('unsicher'); expect(km.patient?.nachname).toBe('Meyer');
expect(matchPatient(tp('pat_03115'), p)).toEqual({art:'fehlt', patient:null}); // Lena Krause
```

- [ ] **Step 3:** Die Tests mit `cd api && npx vitest run test/time.test.ts test/matching.test.ts` ausführen, Erwartung: FAIL.
- [ ] **Step 4:** `types.ts`, `time.ts`, `heilmittel.ts`, `matching.ts` und `fixtures.ts` gemäß den Interfaces implementieren.
- [ ] **Step 5:** Die Tests erneut ausführen, Erwartung: PASS.
- [ ] **Step 6:** Committen mit `feat(autopilot): Domänentypen, Berlin-Zeit, Patient-Matching`.

---

### Task 4: Fälle anreichern, Stufe und Empfehlung

**Files:**
- Create: `api/src/domain/enrich.ts`, `api/src/domain/priority.ts`
- Test: `api/test/enrich.test.ts`, `api/test/priority.test.ts`

**Interfaces:**
- Consumes: alles aus Task 3.
- Produces:
  - `findeFaelle(input): Appointment[]`: Termine des Ausfall-Therapeuten (über `terminoPractitionerId`) mit `startsAt ∈ [von, bis)`. Dazu gehören `booked`, außerdem `cancelled` mit `updatedAt ≥ ausfall.createdAt`, sortiert nach `startsAt`.
  - `reichereAn(a: Appointment, input): Omit<Fall,'stufe'|'score'|'gruende'|'empfehlung'|'vorschlag'|'alternativen'|'anrufRang'>`
  - `bewerte(f): {stufe; score; gruende: string[]; empfehlung: Empfehlung}`. Liefert nur die Vor-Empfehlung (`umbuchen`, `ersatzlos_absagen` oder `doppelbuchung_stornieren`). Die Werte `absagen_mit_link` und `eskalieren` setzt erst Task 6.
- Regeln in `reichereAn`:
  - **Behandlungen:** gebuchte Termine derselben Termino-Patient:in mit `startsAt <` Fall-Start. `letzteBehandlung` ist das Berliner Datum der letzten.
  - **Frist:** ohne Behandlung `addDays(ausstellungsdatum, 28)` mit `fristGrund='beginn'`, sonst `addDays(letzte, 14)` mit `'unterbrechung'`. Wenn beide greifen, zählt das Minimum. Ohne Verordnung ist `frist=null`.
  - **`naechsterTermin`:** nächster gebuchter Termin der Patient:in nach dem Fall-Start, ausgenommen die anderen Fälle.
  - **Doppelbuchung:** ein weiterer gebuchter Fall derselben Patient:in am selben Berliner Tag. Der spätere bekommt die Warnung `doppelbuchung` und die Empfehlung `doppelbuchung_stornieren`, der frühere nur die Warnung.
  - **Warnungen:** `unsicher` ergibt `identitaet_pruefen`, `fehlt` ergibt `stammdaten_fehlen`. Ohne Telefon mit E-Mail gibt es `nicht_anrufbar`, ohne beides `nicht_erreichbar`.
  - **`status`:** über die Entscheidung auf `umgebucht` bzw. `abgesagt`. Ist der Fall ohne Entscheidung storniert und gibt es für die Patient:in einen neuen gebuchten Termin mit `source≠'api'` und `bookedAt ≥ ausfall.createdAt`, gilt `selbst_gebucht`. Ist er ohne Entscheidung storniert, sonst `abgesagt`. Andernfalls `offen`.
  - **`minutenBisStart`:** `(startsAt − jetzt)` in Minuten.
- Regeln in `bewerte`:
  - **Stufe:** `pruefen`, wenn eine spätere Doppelbuchung vorliegt oder `match='fehlt'`. Sonst `frist`, wenn `frist ≤ addDays(berlinDate(jetzt),3)`. Sonst `hoch`, wenn Frequenz 2 oder die Diagnosegruppe in {EX3, LY2} liegt. Sonst `normal`.
  - **Score:** `clamp0..100( (frist ? max(0, 40 − 4·daysBetween(heute, frist)) : 0) + 15·frequenz + min(30, 2·Tage seit letzter Behandlung) )`
  - **Chips (`gruende`):** z. B. `Frist 09.09. (Behandlungsbeginn)`, `2×/Woche`, `EX3 (Tie-Breaker)`, `nächster Termin Mi 09.09.`.
  - **Empfehlung:** `doppelbuchung_stornieren`. Sonst `ersatzlos_absagen`, wenn `naechsterTermin` existiert, `daysBetween(Fall-Tag, nächster-Tag) ≤ absageTage` gilt und (`frist` ist null oder `nächster-Tag ≤ frist`). Sonst `umbuchen`.

- [ ] **Step 1: Failing Tests schreiben** (mit `loadFixtureInput()`, Helfer `fallFuer(name)`):

```ts
expect(findeFaelle(input)).toHaveLength(14);
expect(fallFuer('Cem Oeztuerk')).toMatchObject({frist:'2026-09-09', fristGrund:'beginn'});
expect(fallFuer('Renate Vogel')).toMatchObject({frist:'2026-09-09', fristGrund:'unterbrechung', letzteBehandlung:'2026-08-26'});
expect(bewerte(fallFuer('Cem Oeztuerk'))).toMatchObject({stufe:'frist', empfehlung:'umbuchen'});
expect(bewerte(fallFuer('Renate Vogel')).stufe).toBe('frist');
expect(bewerte(fallFuer('Jan Ahrens')).empfehlung).toBe('ersatzlos_absagen');
const [m1, m2] = faelleFuer('Marek Kowalski');           // 10:00, 16:20
expect(m1.warnungen.map(w=>w.code)).toContain('doppelbuchung');
expect(bewerte(m2)).toMatchObject({stufe:'pruefen', empfehlung:'doppelbuchung_stornieren'});
expect(fallFuer('Katrin Meier')).toMatchObject({match:'unsicher', verordnung:{diagnosegruppe:'EX3'}});
expect(bewerte(fallFuer('Lena Krause')).stufe).toBe('pruefen');
expect(fallFuer('Gisela Neumann').warnungen.map(w=>w.code)).toContain('nicht_anrufbar');
expect(fallFuer('Sabine Czerny').minutenBisStart).toBe(20);
```

- [ ] **Step 2:** Die Tests ausführen, Erwartung: FAIL.
- [ ] **Step 3:** `enrich.ts` und `priority.ts` gemäß den Regeln implementieren.
- [ ] **Step 4:** Die Tests ausführen, Erwartung: PASS.
- [ ] **Step 5:** Committen mit `feat(autopilot): Fristen, Doppelbuchung, Stufe und Empfehlung`.

---

### Task 5: Freie Slots

**Files:**
- Create: `api/src/domain/slots.ts`
- Test: `api/test/slots.test.ts`

**Interfaces:**
- Consumes: Task 3 und 4 (`frist`, `heilmittel`, `appointment` aus dem angereicherten Fall).
- Produces: `freieSlots(fall: Pick<Fall,'appointment'|'heilmittel'|'frist'>, input: AutopilotInput, reserviert: Slot[]): Slot[]`, sortiert nach Rang.
- Regeln:
  - **Tage:** von `berlinDate(jetzt)` bis `min(frist ?? ∞, exportFensterBis)`, nur Mo–Fr.
  - **Therapeut:innen:** mit passender Qualifikation. Die ausgefallene Person zählt nur an Tagen außerhalb von `[von, bis)`.
  - **Arbeitsblöcke:** pro Block aus `arbeitszeiten` (Wochentag) Starts `von, von+20, …`, solange `start + dauer ≤ bis`.
  - **Filter:** Der Slot muss bei `≥ jetzt + 20 Min` beginnen. Er darf sich weder mit gebuchten Terminen dieser Person noch mit `reserviert` derselben Person überschneiden. Tage, an denen die Patient:in einen anderen gebuchten Termin hat, fallen weg (der Fall selbst und die anderen Fälle des Ausfalls zählen dabei nicht).
  - **Rang:** Die Praxis des Originals ergibt sich über `locationId`. Rang 1: gleicher Tag, gleiche Praxis, gleiche Startzeit (`gleicheUhrzeit=true`). Rang 2: gleicher Tag, gleiche Praxis. Rang 3: gleicher Tag, andere Praxis. Rang 4: Folgetage.
  - **Sortierung:** `(rang, Tag, gleichePraxis ? 0 : 1, startsAt)`.

- [ ] **Step 1: Failing Tests schreiben:**

```ts
const s = (name: string) => freieSlots(fallFuer(name), input, []);
expect(s('Kerstin Nowak')[0]).toMatchObject({rang:1, gleicheUhrzeit:true, startsAt:'2026-09-07T07:20:00.000Z', practitionerId:'prac_02'});
expect(s('Brigitte Hoffmann').every(x => ['prac_05','prac_01'].includes(x.practitionerId))).toBe(true);
expect(s('Brigitte Hoffmann').some(x => x.startsAt.startsWith('2026-09-07'))).toBe(false);   // Meltem voll
expect(s('Frank Krueger').every(x => !['prac_04','prac_06','prac_08'].includes(x.practitionerId))).toBe(true);
expect(s('Cem Oeztuerk').every(x => berlinDate(x.startsAt) <= '2026-09-09')).toBe(true);
expect(s('Sabine Czerny').every(x => x.startsAt >= '2026-09-07T06:00:00.000Z')).toBe(true); // Vorlauf
expect(s('Jan Ahrens').some(x => berlinDate(x.startsAt) === '2026-09-09')).toBe(false);    // hat Mi schon Termin
expect(s('Cem Oeztuerk').some(x => x.practitionerId==='prac_01' && berlinDate(x.startsAt)==='2026-09-07')).toBe(false);
// 0805: Mi 09.09. 09:20 bei Sofia wird frei
const s5 = freieSlots(fallFuer('Cem Oeztuerk', loadFixtureInput('0805')), loadFixtureInput('0805'), []);
expect(s5.some(x => x.practitionerId==='prac_04' && x.startsAt==='2026-09-09T07:20:00.000Z')).toBe(true);
```

- [ ] **Step 2:** Die Tests ausführen, Erwartung: FAIL.
- [ ] **Step 3:** `freieSlots` implementieren.
- [ ] **Step 4:** Die Tests ausführen, Erwartung: PASS.
- [ ] **Step 5:** Committen mit `feat(autopilot): freie Slots mit Qualifikation, Frist und Rang`.

---

### Task 6: Autopilot, also Verteilung und Anrufreihenfolge (danach Merge von `feature/autopilot`)

**Files:**
- Create: `api/src/domain/autopilot.ts`
- Test: `api/test/autopilot.test.ts`

**Interfaces:**
- Consumes: `findeFaelle`, `reichereAn`, `bewerte`, `freieSlots`.
- Produces:
  - `runAutopilot(input: AutopilotInput): Fall[]`, sortiert nach `anrufRang` (0-basiert)
  - `slotsFuerFall(appointmentId: string, input): (Slot & {reserviertFuer: string|null})[]`. Liefert alle freien Slots ohne Reservierung und markiert, welche als Vorschlag für eine andere Patient:in reserviert sind.
- Algorithmus:
  1. Alle Fälle anreichern und bewerten.
  2. Offene Fälle mit Empfehlung `umbuchen` sortieren nach `(Stufe frist<hoch<normal<pruefen, score desc, startsAt)`.
  3. Nacheinander `freieSlots(f, input, reserviert)` bilden. `vorschlag` ist der erste Slot, `alternativen` die nächsten 2. Der Vorschlag wird in `reserviert` aufgenommen.
  4. Danach die Empfehlung anpassen. Ohne Vorschlag wird `stufe==='frist'` zu `eskalieren`, alles andere zu `absagen_mit_link`. `stufe==='normal'` mit Vorschlag-Rang 4 wird zu `absagen_mit_link` (der Vorschlag bleibt sichtbar).
  5. **Anrufreihenfolge:** offene Fälle mit `minutenBisStart < 60` zuerst (nach Start), dann die übrigen offenen nach `(Stufe, score desc, startsAt)`, danach die erledigten nach `startsAt`.

- [ ] **Step 1: Failing Tests schreiben:**

```ts
const faelle = runAutopilot(loadFixtureInput());
test('kein Slot doppelt vergeben', () => {
  const keys = faelle.flatMap(f => f.vorschlag ? [f.vorschlag.practitionerId + f.vorschlag.startsAt] : []);
  expect(new Set(keys).size).toBe(keys.length);
});
test('Frist-Fälle werden vor ihrer Frist bedient oder eskaliert', () => {
  for (const f of faelle.filter(f => f.stufe === 'frist'))
    expect(f.vorschlag ? berlinDate(f.vorschlag.startsAt) <= f.frist! : f.empfehlung === 'eskalieren').toBe(true);
});
test('ersatzlos/doppelbuchung verbrauchen keinen Slot', () => {
  expect(faelle.filter(f => ['ersatzlos_absagen','doppelbuchung_stornieren'].includes(f.empfehlung)).every(f => f.vorschlag === null)).toBe(true);
});
test('Anrufreihenfolge: Sabine Czerny (08:00) und Lena Krause (08:20) zuerst', () => {
  expect(faelle.slice(0,2).map(f => f.appointment.patient.name)).toEqual(['Sabine Czerny','Lena Krause']);
});
test('erledigte Fälle reservieren nichts und stehen hinten', () => {
  const inp = loadFixtureInput();
  const cem = runAutopilot(inp).find(f => f.appointment.patient.name === 'Cem Oeztuerk')!;
  inp.entscheidungen.push({appointmentId: cem.appointment.id, aktion:'abgesagt_mit_link', neuerTerminId:null, createdAt: inp.jetzt});
  const r = runAutopilot(inp); const c = r.find(f => f.appointment.id === cem.appointment.id)!;
  expect(c.status).toBe('abgesagt'); expect(c.vorschlag).toBeNull(); expect(r.at(-1)!.status).not.toBe('offen');
});
test('slotsFuerFall markiert fremde Reservierungen', () => {
  const inp = loadFixtureInput();
  const kerstin = runAutopilot(inp).find(f => f.appointment.patient.name === 'Kerstin Nowak')!;
  expect(slotsFuerFall(kerstin.appointment.id, inp).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2:** Die Tests ausführen, Erwartung: FAIL.
- [ ] **Step 3:** `runAutopilot` und `slotsFuerFall` implementieren.
- [ ] **Step 4:** `cd api && npm test` ausführen, Erwartung: alle Unit-Tests PASS.
- [ ] **Step 5:** Committen mit `feat(autopilot): gemeinsame Slot-Verteilung und Anrufreihenfolge`. Danach Review des Diffs über den ganzen Branch, Merge von `feature/autopilot` nach `develop` mit `--no-ff` und Worktree entfernen.

---

### Task 7: API-Routen und Outbox (Worktree `feature/api`, nach Task 2 und 6)

**Files:**
- Create: `api/src/repo/load.ts`, `api/src/outbox/messages.ts`, `api/src/routes/{ausfall.ts,faelle.ts,patienten.ts,outbox.ts,sim.ts}`
- Modify: `api/src/server.ts` (Routen registrieren)
- Test: `api/test/messages.test.ts`, `api/test/routes.int.test.ts`

**Interfaces:**
- Consumes: `runAutopilot`, `slotsFuerFall`, `MockTerminoClient`, `ConflictError`, `applySnapshot`.
- Produces:
  - `loadInput(pool, ausfallId): Promise<AutopilotInput>`
  - `nachrichten(art: 'verschoben'|'abgesagt_mit_link'|'ersatzlos_abgesagt'|'doppelbuchung_storniert', ctx: {patient: TerminoPatient; kontakt: {telefon: string|null; email: string|null}; alt: Appointment; neu?: {startsAt: string; praxisName: string; therapeutName: string}}): {kanal: 'sms'|'email'; empfaenger: string; betreff: string|null; text: string}[]`. Kontakt aus den Stammdaten, falls vorhanden, sonst aus Termino.
  - HTTP-Vertrag (Antwortformen, die `web/src/types.ts` spiegelt):
    - `GET /api/ausfall` → `{id, therapeutName, von, bis}[]`
    - `GET /api/ausfall/:id/faelle` → `{ausfall: {id, therapeutName, von, bis}, jetzt, exportStand, faelle: Fall[]}`
    - `GET /api/faelle/:appointmentId/slots` → `(Slot & {reserviertFuer: string|null})[]`
    - `POST /api/faelle/:appointmentId/umbuchen` `{practitionerId, startsAt}` → `200 {neuerTerminId}` | `409 {fehler:'slot_belegt'|'bereits_entschieden'}`
    - `POST /api/faelle/:appointmentId/absagen` `{art: 'mit_link'|'ersatzlos'|'doppelbuchung'}` → `200` | `409 {fehler:'bereits_entschieden'}`
    - `POST /api/patienten/:patientId/verknuepfen` `{terminoPatientId}` → `200` | `409 {fehler:'bereits_verknuepft'}`
    - `GET /api/outbox` → `{id, appointmentId, kanal, empfaenger, betreff, text, createdAt}[]` (neueste zuerst)
    - `GET /api/sim/export` → `{stand}`, `POST /api/sim/export` `{stand}` → `{stand, konflikte}`
    - `POST /api/sim/reset` → leert `ausfall.entscheidung` und `ausfall.outbox`, löscht Termine mit `source≠'export'`, setzt `stamm.patient.termino_patient_id` aus der JSON zurück und spielt `0800` ein (für wiederholbare Demos)
- **Umbuchen:** Zuerst prüfen, ob eine Entscheidung existiert, dann 409. `book` legt den neuen Termin an (gleiche Leistung, Dauer und Patient-JSON, `locationId` aus der Praxis des Slots, `at = config.now`). Anschließend das Original per `cancel` stornieren, die Entscheidung mit `umgebucht` speichern und Outbox-Nachrichten vom Typ `verschoben` erzeugen. Bei einem `ConflictError` antwortet die Route mit 409 `slot_belegt`.
- **Absagen:** Das Original per `cancel` stornieren. Die Aktion wird über `mit_link→abgesagt_mit_link`, `ersatzlos→ersatzlos_abgesagt` bzw. `doppelbuchung→doppelbuchung_storniert` bestimmt, dazu gehören die passenden Nachrichten.
- Alle Eingaben werden per zod validiert. Ungültige Eingaben ergeben 400.

- [ ] **Step 1:** Lege den Worktree mit `git worktree add .worktrees/api -b feature/api develop` an.
- [ ] **Step 2: Failing Tests schreiben:**

```ts
// messages.test.ts
const gisela = {telefon: null, email: 'gisela.neumann@example.com'};
expect(nachrichten('abgesagt_mit_link', {...ctx, kontakt: gisela}).map(m => m.kanal)).toEqual(['email']);
expect(nachrichten('abgesagt_mit_link', ctx)[0].text).toContain('https://termino.example/buchen?patient=');
expect(nachrichten('verschoben', {...ctx, neu})[0].text).toContain('09.09.');
expect(nachrichten('verschoben', {...ctx, kontakt: {telefon: null, email: null}, neu})).toEqual([]);
// routes.int.test.ts (fastify.inject, vorher POST /api/sim/reset)
test('Faelle: 14 Stück, Anrufreihenfolge beginnt mit Sabine Czerny', ...);
test('umbuchen doppelt → zweiter Aufruf 409 bereits_entschieden, nur eine Buchung', ...);
test('umbuchen in belegten Slot → 409 slot_belegt', ...);   // prac_02, 2026-09-07T06:00:00Z
test('verknuepfen Katrin Meyer → match exakt beim nächsten GET', ...);
test('Toggle 0805 → GET /slots für Cem enthält prac_04 2026-09-09T07:20:00.000Z, bei 0800 nicht', ...);
```

- [ ] **Step 3:** Die Tests ausführen, Erwartung: FAIL.
- [ ] **Step 4:** `load.ts`, `messages.ts` und die Routen implementieren, anschließend in `server.ts` registrieren.
- [ ] **Step 5:** `npm test && npm run test:int` ausführen, Erwartung: PASS. Smoke-Test: `curl localhost:3000/api/ausfall/<id>/faelle | head`.
- [ ] **Step 6:** Committen mit `feat(api): Routen für Fälle, Umbuchen, Absagen, Verknüpfen, Outbox, Sim`. Danach Review, Merge nach `develop` und Worktree entfernen.

---

### Task 8: Oberfläche für den Empfang (Worktree `feature/ui`, Vertrag aus Task 7)

**Files:**
- Create: `web/src/{api.ts,types.ts,format.ts,styles.css}`, `web/src/components/{Header,FallKarte,SlotPicker,MatchVergleich,OutboxDrawer}.tsx`
- Modify: `web/src/App.tsx`, `web/package.json` (+ `@tanstack/react-query`)

**Interfaces:**
- Consumes: den HTTP-Vertrag aus Task 7. `types.ts` kopiert `Fall`, `Slot`, `Warnung` usw. aus `api/src/domain/types.ts` (bewusst dupliziert, siehe README).
- Produces: eine Seite gemäß Spec §7.
- Verhalten:
  - **Daten und Sortierung:** `useQuery(['faelle', id], …, {refetchInterval: 300_000})`. Die Sortierung schaltet zwischen `anrufRang` (Standard) und `startsAt`, clientseitig. Nach jeder Mutation werden `faelle` und `outbox` per `invalidate` neu geladen.
  - **Kopfzeile:** Name, Datum, Zähler offen/erledigt, [Jetzt aktualisieren], Toggle 08:00/08:05 mit Anzeige der Konflikte, [Outbox (n)], Sortier-Umschalter, [Demo zurücksetzen].
  - **Fallkarte:**
    - Rand in der Farbe der Stufe (🔴 `#d64545`, 🟠 `#e8912d`, 🟢 `#3a9d5d`, ⚪ `#8a8f98`), Zeit in Berliner Zeit, Praxis, Leistung, Name, Telefon (als `tel:`-Link), E-Mail, „in X Min“.
    - Chips für `gruende` und `warnungen` (`stammdaten_fehlen` rot).
    - Empfehlung als Satz, Vorschlag mit Badge „✓ gleiche Uhrzeit“.
    - Buttons, je nach Empfehlung: [Bestätigen], [Anderer Slot ▾], [Absagen mit Link], [Ersatzlos absagen], [Doppelbuchung stornieren].
    - Bei `unsicher`: `MatchVergleich` mit [Zusammenführen].
    - Bei 409 `slot_belegt`: Hinweis „Slot inzwischen belegt, Vorschläge aktualisiert“.
    - Erledigte Fälle ausgegraut mit Status-Badge.
  - **`SlotPicker`:** lädt `/slots` beim Öffnen und gruppiert nach Tag. Reservierte Slots zeigen „reserviert für X“ und bleiben wählbar.
  - **`OutboxDrawer`:** Liste mit Symbol für den Kanal, Empfänger und Text.
  - **`format.ts`:** `zeit(iso)`, `tag(iso)` („Mi 09.09.“), über `Intl` mit `Europe/Berlin`.

- [ ] **Step 1:** Lege den Worktree mit `git worktree add .worktrees/ui -b feature/ui develop` an.
- [ ] **Step 2:** `types.ts`, `api.ts` (fetch-Wrapper, der bei `!ok` die JSON-Fehlermeldung wirft) und `format.ts` implementieren.
- [ ] **Step 3:** `Header`, `FallKarte`, `SlotPicker`, `MatchVergleich`, `OutboxDrawer` und `App` implementieren, dazu schlichtes CSS (Karten-Layout, bis 390 px Breite nutzbar).
- [ ] **Step 4:** Prüfen, ob `cd web && npx tsc --noEmit` ohne Fehler durchläuft.
- [ ] **Step 5:** Smoke-Test mit `docker compose up --build`:
  - 14 Karten erscheinen, die ersten beiden sind Czerny und Krause.
  - Kerstin Nowak zeigt „✓ gleiche Uhrzeit“.
  - Bestätigen bei Kerstin legt eine Outbox-Nachricht an, und die Karte wird ausgegraut.
  - Toggle 08:05 ändert den Vorschlag oder die Slot-Liste für Cem.
  - Zusammenführen bei Katrin blendet die Warnung aus.
  - [Demo zurücksetzen] stellt den Ausgangszustand her.
- [ ] **Step 6:** Committen mit `feat(ui): Fallliste für den Empfang mit Aktionen, Slot-Auswahl, Outbox, Toggle`. Danach Review, Merge nach `develop` und Worktree entfernen.

---

### Task 9: Abgabedokumente (Worktree `feature/docs`)

**Files:**
- Create: `README.md` (ersetzt die Datenbeschreibung; deren Inhalt kommt nach `data/README.md`), `ARCHITECTURE.md`
- Modify: `CLAUDE.md` (falls sich Befehle geändert haben)

- [ ] **Step 1:** Lege den Worktree mit `git worktree add .worktrees/docs -b feature/docs develop` an. Verschiebe die bisherige `README.md` per `git mv` nach `data/README.md`.
- [ ] **Step 2:** `README.md` mit folgenden Abschnitten:
  - Start (`docker compose up`, URLs, Demo-Reset)
  - Das Problem in einem Satz
  - Was die Oberfläche tut (5 Stichpunkte)
  - Datenbefunde (Tabelle aus Spec §2)
  - Annahmen (Spec §3, gekennzeichnet)
  - Priorisierungslogik (Kurzfassung von §5)
  - Bewusst weggelassen
  - Wo abgebrochen
  - Nächste Schritte (inkl. **Playwright-E2E-Tests**, echte Termino-API, Warteliste, Kanalpräferenz und Opt-in, Kennzahlen)
  - Library-Wahl mit Begründung je Library (Fastify, pg ohne ORM, zod, Vitest, Vite, TanStack Query, Intl statt date-lib, Typen bewusst dupliziert statt Shared-Package)
  - Prompts und Agent (Verweis auf `CLAUDE.md`, `docs/superpowers/`, Export der Session)
- [ ] **Step 3:** `ARCHITECTURE.md` mit den 6 Eckpfeilern aus Spec §11, jeweils 2–4 Zeilen, dazu das Komponenten-Diagramm als Zielbild (Mandanten, Integrationsschicht, Queue) als Mermaid. Maximal etwa 1 Seite.
- [ ] **Step 4:** Alle Links und Befehle in der README gegen den tatsächlichen Stand prüfen (`docker compose up` einmal frisch nach `docker compose down -v`).
- [ ] **Step 5:** Committen mit `docs: README, ARCHITECTURE, Datenbeschreibung nach data/`. Danach Review, Merge nach `develop` und Worktree entfernen.

---

### Tasks 10–14: Soll (nur wenn Zeit bleibt, in dieser Reihenfolge, je ein Worktree)

Jeder Task: Worktree → umsetzen → Test bzw. Smoke-Test → Commit → Review → Merge. Nach jedem Task den Abschnitt „Wo abgebrochen“ in der README aktualisieren.

- [ ] **Task 10, Countdown (`feature/countdown`):** Kopfzeile zeigt „nächstes Update in m:ss“, basierend auf `dataUpdatedAt` aus der Query plus 300 s. Der Wert tickt jede Sekunde. Smoke-Test: Der Countdown springt nach [Jetzt aktualisieren] auf 5:00.
- [ ] **Task 11, Krankmeldung verlängern (`feature/verlaengern`):** `PATCH /api/ausfall/:id {bis}` (zod: `bis > von`). UI-Button „verlängern bis Di / Mi / Fr“. Test (int): Nach PATCH bis `2026-09-08T22:00:00Z` enthält `faelle` Annas Termine vom 08.09., bestehende Entscheidungen bleiben.
- [ ] **Task 12, Selbstbuchung simulieren (`feature/selbstbuchung`):** `POST /api/sim/selbstbuchung {appointmentId}` bucht den ersten freien Slot mit `source='patient'` und storniert das Original. Test (int): Der Fall hat danach den Status `selbst_gebucht`.
- [ ] **Task 13, Diagnosegruppen (`feature/diagnosegruppen`):** `data/diagnosegruppen.json` mit `{code, bezeichnung, quelle}` für WS1, WS2, EX2, EX3, LY2 aus heilmittelkatalog.de (die Quelle wird vorher nachgeschlagen und nicht erfunden). Die API liefert die Bezeichnung mit, die Chips zeigen Klartext.
- [ ] **Task 14, Notfallliste (`feature/notfallliste`):** Route `/#druck` rendert die Anrufreihenfolge als druckbare Tabelle (Zeit, Name, Telefon, Empfehlung, Vorschlag, Warnungen) mit `@media print`. README-Abschnitt „IT-Notfallkonzept“: Was tun, wenn unser Service, Termino oder beide ausfallen (Liste um 07:00 drucken, Telefon-Fallback, Nachpflege).

- [ ] **Task 15, Playwright-Testfälle für das Loom (`feature/e2e`, Wunsch von Malte, nach den Tasks 1–9):** Playwright-Tests gegen `docker compose up` für die wichtigsten Fälle: (1) Anrufreihenfolge beginnt mit Sabine Czerny und Lena Krause, (2) Cem zeigt 🔴 Frist 09.09., (3) Kerstin zeigt „✓ gleiche Uhrzeit“ und Bestätigen erzeugt Outbox-Einträge, (4) Jan wird ersatzlos absagbar, (5) Marek zeigt die Doppelbuchung, (6) Katrin: Zusammenführen blendet die Warnung aus, (7) Toggle 08:05 bietet Cem den Slot Mi 09:20, (8) Gisela „nicht anrufbar“, (9) Doppelklick ergibt „bereits entschieden“. Vor jedem Test `POST /api/sim/reset`. Die Testfälle dienen zugleich als Drehbuch für das Loom.

---

## Reihenfolge und Parallelität

```
Task 1 (develop) ──┬─▶ Task 2 termino-mock ─┐
                   └─▶ Tasks 3–6 autopilot ─┴─▶ Task 7 api ─▶ Task 8 ui ─▶ Task 9 docs ─▶ Tasks 10–14 (Soll)
```

Die Tasks 2 und 3–6 sind unabhängig voneinander und können parallel laufen. Am Ende wird `develop` nach `main` gemergt, nach Freigabe.
