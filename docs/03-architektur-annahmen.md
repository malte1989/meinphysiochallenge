# Architektur: Annahmen und Entscheidungen

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [Loom-Leitfaden](00-loom-leitfaden.md)

Kennzeichnung: **[Du]** Entscheidung oder Korrektur von Malte, **[Claude]** Vorschlag oder Befund des Agenten, **[F]** Fakt aus Daten oder Aufgabe, **[A]** Annahme, **[Q]** externe Quelle.

Diagramme (Komponenten und Ablauf „Bestätigen“ mit 409): [Spec, Abschnitt 4](superpowers/specs/2026-09-30-der-ausfall-design.md). Zielbild für 100+ Praxen: [ARCHITECTURE.md](../ARCHITECTURE.md).

## Annahmen [A]

| Annahme | Warum es sie braucht | Was gilt, wenn sie falsch ist |
|---|---|---|
| Termino bietet eine **Schreib-API** (buchen, stornieren), hier gemockt | Die Aufgabe liefert nur Exporte zum Lesen | Der Button „Bestätigen“ legt dann nur eine Aufgabe an, und der nächste Export bestätigt die Buchung. Nur der Adapter hinter `TerminoClient` ändert sich |
| Termino liefert weiterhin **alle 5 Minuten einen vollständigen Export** | So beschreibt es die Aufgabe [F] | Mit Webhooks wird schneller aktualisiert, sonst ändert sich nichts |
| **Unsere Stammdaten und Verordnungen sind führend**, Termino ist führend für Termine | Die Aufgabe trennt es so [F] | Beim Zusammenführen schreibt die App nur die `termino_patient_id` in unsere Stammdaten, nie nach Termino |
| **Krankmeldung gilt für heute**, der Zeitraum ist ein Parameter | Nicht aus den Daten ableitbar | „Krankmeldung verlängern“ erweitert den Zeitraum (gebaut), der Autopilot rechnet neu |
| **„Jetzt“ = 07:40 Berlin** (konfigurierbar) | Countdown und „in X Min“ müssen zur Geschichte passen | Im Betrieb gilt die Systemzeit |
| **SMS und E-Mail werden nur erzeugt, nicht versendet** (Outbox-Tabelle) | Keine externen Dienste | Ein Versanddienst liest später dieselbe Outbox (Outbox-Pattern) |
| **Frontend in React = SPA mit Vite** | Strenge Lesart der Vorgabe | Im Team wäre das eine gemeinsame Architekturentscheidung |
| **Keine Auth, keine Mandanten im Code** | Laut Aufgabe nicht erwartet [F] | Siehe „Zielbild für 100+ Praxen“ unten und ARCHITECTURE.md |
| **Ein IT-Notfallkonzept existiert** | Nicht Kern der Demo | Gebaut ist eine druckbare Notfallliste. Das Konzept selbst ist ein ungeübter Entwurf in der README, „Rückgängig“ fehlt |

## Entscheidungen im Prototyp

| Entscheidung | Warum |
|---|---|
| **Drei Postgres-Schemas:** `stamm` (unsere Stammdaten), `termino` (Mock des externen Tools), `ausfall` (Entscheidungen, Outbox) | Klare Verantwortung. Jedes Schema hat genau einen Schreiber |
| **Schutz vor Überschneidung in der Datenbank:** Exclusion Constraint (`btree_gist`) auf Therapeut:in und Zeitraum, nur für gebuchte Termine | Doppelbuchungen sind unmöglich, egal ob Empfang, Autopilot oder Patient:in bucht (Antwort 409 beim Bestätigen). Das schützt das **Buchen**. Dass zwei Patient:innen denselben Slot **vorgeschlagen** bekommen, verhindert die gemeinsame Berechnung im Autopiloten |
| **`TerminoClient` als Interface**, heute die Mock-Implementierung | Die echte API ist ein austauschbarer Adapter und ein Beispiel für die Integrationsschicht im Zielbild unten |
| **Autopilot als reine Funktion ohne Speicherung** | Er rechnet bei jedem Abruf neu. Neue Buchungen, Stornos und Selbstbuchungen fließen automatisch ein. Gut testbar mit den echten Daten ohne Datenbank |
| **Nur Entscheidungen des Empfangs werden gespeichert** | Nachvollziehbar, wer was entschieden hat. Grundlage für ein späteres Audit-Log |
| **Speichern in UTC, Anzeige in `Europe/Berlin`** | Die Daten liegen in UTC [F]. Das vermeidet Fehler bei der Sommerzeitumstellung |
| **Export-Toggle 08:00 ↔ 08:05** fasst nur Termine aus dem Export an, eigene Buchungen bleiben. Kollisionen werden als Konflikt gemeldet | Simuliert externe Änderungen ehrlich, ohne eigene Entscheidungen zu überschreiben |
| **Seed beim Start idempotent, dazu `POST /api/sim/reset`** | Ein Befehl startet alles, und die Demo ist beliebig oft wiederholbar |
| **Typen zwischen api und web bewusst dupliziert** | Kein Shared-Package in 3 Stunden. Als nächster Schritt kommt die Generierung aus einem OpenAPI-Schema |
| **Monorepo mit getrennten Containern** (`db`, `api`, `web`) | Entspricht dem späteren Schnitt der Services |

## Zielbild für 100+ Praxen (Details in ARCHITECTURE.md)

| Eckpfeiler | Kernaussage |
|---|---|
| Mandantenmodell | Eine gemeinsame DB, `tenant_id` in jeder Tabelle, Postgres Row-Level-Security. Große Partner bekommen optional eine eigene DB |
| Integrationsschicht | Ein Adapter pro Buchungs- und Praxissoftware, Webhook oder Polling → Inbox, Idempotenz, Outbox für Schreibzugriffe |
| Autopilot | Zustandsloser Domänenservice. Regeln (Fristen, Schwellen, Gewichte) pro Mandant konfigurierbar und versioniert |
| Benachrichtigungen | Eigener Service mit Queue, Vorlagen pro Mandant, Kanalpräferenz und Opt-in |
| DSGVO und Gesundheitsdaten | Hosting in der EU, Verschlüsselung, Audit-Log, Rollen pro Standort, Löschkonzept |
| Betrieb | Observability pro Mandant, Feature-Flags, Pilot an einem Standort, Notfallliste offline |
