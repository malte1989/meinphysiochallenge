# Loom-Leitfaden

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [Loom-Leitfaden](00-loom-leitfaden.md)

Maximal 5 Minuten. Pro Abschnitt: die Seite (1 bis 4), das Gezeigte und wenige Stichpunkte zum Ablesen.

## Vor der Aufnahme

1. `docker compose up --build -d --wait`, dann http://localhost:5173 öffnen und **Demo zurücksetzen** klicken ([README, Start](../README.md#start)).
2. Nicht-stören-Modus an. Tabs: Oberfläche, [README](../README.md), [ARCHITECTURE.md](../ARCHITECTURE.md), dieses Dokument.
3. Optional als Drehbuch: `cd e2e && npm run test:drehbuch` (Komplettdurchlauf, langsame Klicks, etwa 45 Sekunden) oder `npm run test:ui` (einzelne Schritte wählbar). Tempo per `SLOW_MO` und `PAUSE` in ms. Nach jedem Wiederholen **Demo zurücksetzen**.

## Ablauf

| Zeit | Thema | Seite |
|---|---|---|
| 0:00–0:30 | Problem | [1 Problem und Daten](01-problem-und-daten.md#problemerfassung) |
| 0:30–3:30 | Live (Datenfallen, Produktbrille, Demo) | [1 Problem und Daten](01-problem-und-daten.md#was-in-den-daten-steckt), [2 Produktbrille](02-produktbrille-und-technik.md#produktbrille-die-kernentscheidungen), Oberfläche ([Drehbuch](../e2e/tests/loom-drehbuch.spec.ts)) |
| 3:30–4:15 | Arbeit mit dem Agenten | [2 Technik und Umfang](02-produktbrille-und-technik.md#technik-und-umfang) |
| 4:15–5:00 | Annahmen, Skalierung, nächste Schritte | [3 Architektur](03-architektur-annahmen.md), [4 Todos](04-todos-und-naechste-schritte.md) |

## Skript

### 0:00–0:30 · Problem
**Seite:** [1 Problem und Daten](01-problem-und-daten.md#problemerfassung) · **Zeigen:** Oberfläche mit den 14 Fällen

- Montag 07:40, Anna krank, erster Termin um 08:00: 14 Termine, der Empfang hat nur Minuten.
- Heute sucht er Lücken, Qualifikation und Verordnungsfristen von Hand.
- Ziel: Der Empfang bekommt automatisiert Vorschläge und bestätigt die wichtigsten Termine.

### 0:30–3:30 · Live
**Seiten:** [1 Problem und Daten](01-problem-und-daten.md#was-in-den-daten-steckt), [2 Produktbrille](02-produktbrille-und-technik.md#produktbrille-die-kernentscheidungen) · **Zeigen:** Oberfläche, in dieser Reihenfolge

1. **Reihenfolge.** Zwei Reihenfolgen: Slots nach Priorität, Anrufe nach Dringlichkeit (Sabine, in 20 Minuten, zuerst). Zeiten kommen als UTC, angezeigt wird Berliner Zeit. *Zeigen:* Sortierung „Autopilot“ und „Uhrzeit“.
2. **Datenfallen.**
   - **Marek** steht zweimal (doppelt gebucht), der spätere Termin hat „Doppelbuchung stornieren“.
   - **Katrin Meier** ist Meyer in den Stammdaten: **Zusammenführen** klicken, die Warnung verschwindet.
   - **Lena** fehlt in den Stammdaten (rote Warnung). **Gisela** hat keine Nummer („keine Nummer“).
3. **Fristen.** Harte Fristen vor „gefühlter“ Dringlichkeit: Die Verordnung von Cem und Renate verfällt am 09.09. „Frisch operiert“ steht nicht in den Daten, die Diagnose ist nur Tie-Breaker. *Zeigen:* Karten von Cem und Renate, Stufe „Frist“.
4. **Kerstin bestätigen.** Vorschläge werden für alle Fälle gemeinsam berechnet, nie zwei Personen derselbe Slot. „✓ gleiche Uhrzeit“ bleibt erhalten. *Zeigen:* **Bestätigen**, dann Outbox: SMS und E-Mail (simuliert).
5. **Jan.** Ersatzlos absagbar, sein nächster Termin ist am Mittwoch, das spart knappe Kapazität. *Zeigen:* **Ersatzlos absagen**.
6. **Toggle 08:05** in der Seitenleiste. Nur drei Termine ändern sich, dadurch ändern sich nur die Alternativen. *Zeigen:* Cem, „Anderer Slot“: Der Mittwoch-Slot ist neu wählbar.
7. **Cem bucht selbst** (Demo-Button): kein Anruf mehr nötig.
8. **Krankmeldung verlängern**, dann „Alle Ausfälle“: neuen Ausfall anlegen (nur simuliert).
9. **Dringlichkeit hebt die Stufe an:** Termine unter 1 Stunde bekommen mindestens „Hoch“, Frist bleibt darüber. Sabine (in 20 Minuten) trägt „Hoch“ und steht auf Platz 1, der Chip „Beginnt in 20 Min“ erklärt warum.

### 3:30–4:15 · Arbeit mit dem Agenten
**Seite:** [2 Technik und Umfang](02-produktbrille-und-technik.md#technik-und-umfang) · **Zeigen:** [CLAUDE.md](../CLAUDE.md), [Spec](superpowers/specs/2026-09-30-der-ausfall-design.md), [Plan](superpowers/plans/2026-09-30-der-ausfall.md)

- Erst selber gelesen: Problem und Daten verstehen. Dann habe ich einen langen Prompt geschrieben was ich verstanden habe und machen würde. Danach habe ich mit Claude und insbesondere dem Brainstorming Skill in Abschnitten mit meiner Freigabe, Spec, Plan und das Test Konzept erstellt.
- **Fünf Themen, die ich mit Claude diskutiert habe:**
  1. **Priorisierung:** Ich wollte frisch Operierte und Schmerzfälle zuerst. Claude: Das steht nicht in den Daten, also zählen die Fristen der Verordnung und die Frequenz.
  2. **Termino:** Ich habe mich für eine (gemockte) Schreib-API entschieden.
  3. **Krankmeldung verlängern:** Was, wenn es Anna mittags nicht besser geht? Ich habe es als Soll aufgenommen, später habe ich es gebaut.
  4. **Dringlichkeit:** Sabine beginnt in 20 Minuten und war trotzdem „Normal“. Ich habe entschieden: Die Zeit hebt die Stufe an.
- 32 Playwright-Tests und das Drehbuch, um die Haupt Anwendungsfälle zu visualisieren.

### 4:15–5:00 · Annahmen, Skalierung, nächste Schritte
**Seiten:** [3 Architektur](03-architektur-annahmen.md), [4 Todos](04-todos-und-naechste-schritte.md) · **Zeigen:** [README, Annahmen](../README.md#annahmen), [ARCHITECTURE.md](../ARCHITECTURE.md)

- Wichtigste Annahme: Termino hat eine Schreib-API (gemockt). Weggelassen: echter Versand, Selbstbuchungsseite, Warteliste, Auth.
- 100+ Praxen: gemeinsame DB mit `tenant_id` und Row-Level-Security (Datenbank blendet bei Abfragen fremde Zeilen aus), zustandsloser Autopilot mit Regeln pro Mandant, eigener Benachrichtigungsservice für Performance, DSGVO (Hosting in der EU, Löschkonzept, Audit Log, Rollenkonzept, etc).
- CI ist geschrieben. Das Notfallkonzept bzw. Rollbackkonzept ist erstellt.
- **Nächste Schritte:**
  - **Produkt:** Authentifizierung für Kunde, Mitarbeiter und Admin. Nachbelegung der frei gewordenen Slots. Echter Versand von SMS und E-Mail mit Opt-in und Kanalpräferenz. Selbstbuchungsseite für Patient:innen. „Rückgängig“ und Audit-Log.
  - **Integration und Skalierung:** Echte Termino-API statt Mock, Webhooks statt Abruf alle 5 Minuten. Mandantenfähigkeit mit `tenant_id` und Row-Level-Security. Regeln (Schwellen, Fenster) pro Mandant einstellbar.
  - **Betrieb und Qualität:** Kennzahlen (Zeit, bis alle informiert sind, Anteil erfolgreich umgebucht, Anrufe pro Ausfall), Monitoring. CI wirklich laufen lassen, dazu Image-Scan und Barrierefreiheits-Test. Bessere Slot-Verteilung, die knappe Qualifikationen schont. Diagnosegruppen gegen die Primärquelle prüfen.

## Das Besondere an der Lösung (zum Nennen, nicht alles zeigen)

Wenn die Zeit knapp ist, reichen diese vier: **Fristen der Verordnung**, **gemeinsame Vorschläge**, **Datenbank-Schutz vor Doppelbuchung** und **Playwright**.

**Produkt, für den Empfang**
- **Anrufreihenfolge („Autopilot“)**, dazu Sortierung nach Uhrzeit. Termine unter 60 Minuten zuerst.
- **Begründeter Vorschlag je Fall** mit bis zu zwei Alternativen, „✓ gleiche Uhrzeit“ und Auswahl aus allen freien Slots.
- **Gemeinsame Berechnung:** nie zwei Personen derselbe vorgeschlagene Slot.
- **Fristen der Heilmittel-Richtlinie** (Behandlungsbeginn 28 Tage, Unterbrechung 14 Tage) bestimmen die Priorität.
- **Ersatzlos absagen**, wenn der nächste Termin nah ist, und **Absagen mit Link** zur Selbstbuchung.
- **Datenprobleme werden sichtbar:** Doppelbuchung, unsicherer Treffer mit **Zusammenführen**, fehlende Stammdaten, keine Telefonnummer. Diagnosegruppen im Klartext, Quelle im Tooltip.
- **Outbox:** SMS und E-Mail werden erzeugt (simuliert).
- **Termino-Export 08:00 ↔ 08:05**, automatische Aktualisierung alle 5 Minuten mit Countdown, „Jetzt aktualisieren“.
- **Selbstbuchung wird erkannt:** „✓ selbst gebucht, kein Anruf nötig“.
- **Krankmeldung verlängern** und **Übersicht aller Ausfälle** mit simuliertem neuem Ausfall.
- **Notfallliste zum Drucken** für den IT-Ausfall.
- **Design** wie das meinphysio+-Buchungstool.

**Zuverlässigkeit und Technik**
- **Datenbank-Überschneidungsschutz** (Exclusion Constraint): kein Slot wird zweimal gebucht. Doppelklick bucht nur einmal, der zweite Aufruf bekommt 409.
- **Autopilot als reine Funktion:** Er rechnet bei jedem Abruf neu, gespeichert werden nur Entscheidungen.
- **`TerminoClient` als Schnittstelle** (heute Mock, später echter Adapter), **Outbox-Muster** für Nachrichten.
- **UTC speichern, Berliner Zeit anzeigen.** TypeScript, Postgres, React, Start mit `docker compose up` (mit Healthcheck).
- **Demo wiederholbar:** Seed beim Start und Button „Demo zurücksetzen“.

**Qualität und Arbeitsweise**
- **51 Unit-, 23 Integrations- und 32 Playwright-Tests.**
- **Playwright:** je Loom-Fall ein Test, dazu ein **Drehbuch mit langsamen Klicks** (`test:drehbuch`), der **UI-Modus** zum Wählen einzelner Schritte (`test:ui`), Video und Trace, simulierte Uhr für den 5-Minuten-Refresh.
- **TDD**, ein Worktree pro Feature, Review vor jedem Merge, Mutationstests für die Verteilung der Slots.
- **CI-Workflow** (geschrieben, nie gelaufen), `npm audit` ohne Funde, Dependabot, gitleaks.
- **Dokumentation:** Spec, Plan, [ARCHITECTURE.md](../ARCHITECTURE.md) (100+ Praxen, Rollen für Auth), Planungsphase in Einzelseiten, benannte Grenzen.

**Ehrlich nennen:** Die Ziffernbedeutung der Diagnosegruppen ist nicht gegen die Primärquelle geprüft. Die CI ist nie gelaufen. „Rückgängig“ und Authentifizierung fehlen, das Notfallkonzept ist ein Entwurf.

## Loom-Abschnitt → Playwright-Test

| Loom | Test in [e2e/tests/faelle.spec.ts](../e2e/tests/faelle.spec.ts) |
|---|---|
| Problem | Überblick: 14 Fälle, Anrufreihenfolge … |
| Live (Datenfallen, Produktbrille, Demo) | Frist: Cem und Renate …, Gleiche Uhrzeit: Kerstin …, Ersatzlos absagen: Jan …, Sortierung nach Uhrzeit, Doppelbuchung: Marek …, Unsicherer Treffer: Katrin …, Stammdaten fehlen: Lena …, Keine Telefonnummer: Gisela …, Toggle 08:05 …, Selbstbuchung …, Countdown …, Krankmeldung verlängern …, Doppelklick … |
