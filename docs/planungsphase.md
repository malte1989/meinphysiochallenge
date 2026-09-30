# Planungsphase: Entscheidungsspur und Loom-Leitfaden

Stand: 2026-09-30, vor der Implementierung. Kennzeichnung: **[Du]** Entscheidung oder Korrektur von Malte, **[Claude]** Vorschlag oder Befund des Agenten, **[F]** Fakt aus Daten oder Aufgabe, **[A]** Annahme.

Die vollständigen Prompts liegen im Session-Export (`/export`) und unter `~/.claude/projects/`. Dieses Dokument ist die Kurzfassung für das Loom.

## 1. Vorgehen in einer Zeile

Erst Aufgabe und Daten lesen, dann mit dem Brainstorming-Skill Problem → Ansätze → Design in vier Abschnitten, Freigabe durch Malte in jedem Schritt, dann Spec und Plan. Bis dahin gab es bewusst keinen Code.

## 2. Problemerfassung

- **Aufgabe [F]:** Notion-Seite (per API gelesen, weil die Seite per JavaScript rendert). Kernsatz: bewertet wird Urteilsvermögen, „wie du mit unsauberen Daten und Zeitdruck umgehst“. Zeitbox 3 Stunden, nicht fertig ist okay.
- **Vorfall [F]:** Mo 07.09.2026, 07:40, Anna Weber krank, 14 gebuchte Termine an beiden Standorten, erster um 08:00.
- **Problem in einem Satz:** Der Empfang muss unter Zeitdruck für jeden Termin entscheiden (umbuchen, absagen, informieren) und sucht dafür heute von Hand Lücken, Qualifikation und Verordnungsfristen.
- **Erfolg:** Der Empfang telefoniert nur noch und bestätigt, er sucht nicht mehr.

## 3. Was in den Daten steckt [F, per Code geprüft]

| # | Befund | Folge fürs Design |
|---|---|---|
| 1 | Zeiten in UTC (`06:00Z` = 08:00 Berlin) | Anzeige in Berliner Zeit |
| 2 | Marek Kowalski hat zwei Termine am selben Tag, Verordnung 1×/Woche | Warnung „Doppelbuchung?“ |
| 3 | „Katrin Meier“ (Termino) ist „Katrin Meyer“ in den Stammdaten, nicht verknüpft | unsicherer Treffer, **zusammenführbar** |
| 4 | Lena Krause fehlt in den Stammdaten | sichtbare Warnung „Stammdaten fehlen“ |
| 5 | Cem Öztürk: Behandlungsbeginn-Frist 09.09., nächster Termin erst 10.09. | höchste Priorität, nie „ersatzlos absagen“ |
| 6 | Renate Vogel: 14-Tage-Unterbrechungsfrist endet 09.09. | höchste Priorität |
| 7 | Gisela Neumann (Jg. 1949) ohne Telefonnummer | „nicht anrufbar“, nur E-Mail |
| 8 | Kalender fast voll, Meltem ist einzige MLD45 in Kreuzberg, kein freies MT in Kreuzberg | Slots müssen gemeinsam verteilt werden |
| 9 | Diff 08:00 → 08:05: ein Storno macht Mi 09.09. 09:20 (Sofia) frei | passt genau für Cem, ideal für die Toggle-Demo |
| 10 | `prac_03` fehlt in den Stammdaten, MLD „45 Min.“ ist mit 40 Min. gebucht, Peter Albrecht ist schon storniert | nur Hinweis in der README |

Fristen [Q]: [AOK](https://www.aok.de/gp/heilmittel-richtlinie-vertragszahnaerzte/beginn-und-gueltigkeit-der-verordnung-neu-geregelt), [heilmittelkatalog.de](https://heilmittelkatalog.de/aenderungen/heilmittelrichtlinie-01-01-2021/)

## 4. Produktbrille: die Kernentscheidungen

| Entscheidung | Wer | Begründung |
|---|---|---|
| **Zwei Reihenfolgen:** Slots nach Priorität vergeben, Empfang ruft nach Dringlichkeit an (Start in < 60 Min zuerst) | [Claude], [Du] freigegeben | Sabine Czerny (08:00) muss zuerst angerufen werden, auch wenn sie nicht die höchste Priorität hat |
| **Harte Fristen der Verordnung vor klinischer Dringlichkeit.** Diagnosegruppe nur als gekennzeichneter Tie-Breaker | [Claude] widerspricht der Annahme „frisch operiert/Schmerz“, [Du] akzeptiert | „Frisch operiert“ steht nicht in den Daten. Eine verfallene Verordnung ist nicht abrechenbar und schickt die Patient:in zurück zum Arzt |
| **Verteilung über alle Fälle gemeinsam (greedy nach Priorität)** | [Claude] | Bei etwa 10 freien Slots für 13 Bedarfe würden sonst mehrere Patient:innen denselben Slot vorgeschlagen bekommen |
| **„Ersatzlos absagen“, wenn der nächste Termin ≤ 2 Tage entfernt ist und vor der Frist liegt** | [Du] (Behandlungsfrequenz), [Claude] ergänzt die Fristprüfung | Spart knappe Slots. Cem bleibt ausgenommen |
| **Unsichere Treffer zusammenführbar** statt nur anzeigen | [Du] | Der Empfang soll Datenfehler direkt beheben können |
| **Fehlende Stammdaten sichtbar anzeigen** | [Du] | Nichts still übergehen |
| Selbstbuchungs-Link nicht pauschal an alle | [Claude] schlägt vor | Geringe Priorität könnte den Slot einer Frist-Patient:in wegnehmen. In der Spec nur teilweise umgesetzt: Der Link geht nur bei Absagen raus, nicht bei Umbuchungen |

## 5. Technik und Umfang

| Entscheidung | Wer | Begründung |
|---|---|---|
| **Termino hat eine Schreib-API (gemockt)**, die Überschneidungen per Exclusion Constraint in Postgres verhindert | [Du] (Variante B) | Anbindung ans Buchungstool ist essenziell, damit es keine Zeitüberschneidungen gibt |
| **React-SPA mit Vite, Fastify, `pg` ohne ORM, zod, Vitest, TanStack Query** (Variante A: Monorepo mit `TerminoClient`-Interface) | [Du] wählt A | Keine SSR-Komplexität, klare Grenzen, schneller Docker-Build, später HTTP-Adapter austauschbar |
| **Annahme „Frontend in React“ = SPA.** Next.js wäre auch React, die Vorgabe wurde streng gelesen | [Du], [Claude] stellt klar | Im Team wäre das eine gemeinsame Architekturentscheidung |
| **Krankmeldung verlängern → Soll** | [Du] | Damit kann der Empfang reagieren, wenn es Anna mittags nicht besser geht |
| **IT-Notfallkonzept:** Annahme „existiert“, Ausformulierung und druckbare Notfallliste optional | [Du] | Nicht Kern der Demo |
| **Playwright-E2E** in die „Nächsten Schritte“ | [Du] | Aktuell gezielte Tests statt Vollabdeckung |
| **Arbeitsablauf:** Setup direkt auf `develop`, danach je ein Worktree pro lose gekoppeltem Feature, Tests plus Diff-Review vor jedem Merge | [Du] | Saubere Commit-Historie, auch ohne Kolleg:innen |
| Architektur-Diagramme in der Spec | [Du] gewünscht | Für das Loom |

## 6. Architektur: Annahmen und Entscheidungen

Diagramme (Komponenten und Ablauf „Bestätigen“ mit 409): Spec, Abschnitt 4.

### 6.1 Annahmen [A]

| Annahme | Warum es sie braucht | Was gilt, wenn sie falsch ist |
|---|---|---|
| Termino bietet eine **Schreib-API** (buchen, stornieren), hier gemockt | Die Aufgabe liefert nur Exporte zum Lesen | Der Button „Bestätigen“ legt dann nur eine Aufgabe an, und der nächste Export bestätigt die Buchung. Nur der Adapter hinter `TerminoClient` ändert sich |
| Termino liefert weiterhin **alle 5 Minuten einen vollständigen Export** | So beschreibt es die Aufgabe [F] | Mit Webhooks wird schneller aktualisiert, sonst ändert sich nichts |
| **Unsere Stammdaten und Verordnungen sind führend**, Termino ist führend für Termine | Die Aufgabe trennt es so [F] | Beim Zusammenführen schreibt die App nur die `termino_patient_id` in unsere Stammdaten, nie nach Termino |
| **Krankmeldung gilt für heute**, der Zeitraum ist ein Parameter | Nicht aus den Daten ableitbar | Verlängern (Soll) erweitert den Zeitraum, und der Autopilot rechnet neu |
| **„Jetzt“ = 07:40 Berlin** (konfigurierbar) | Countdown und „in X Min“ müssen zur Geschichte passen | Im Betrieb gilt die Systemzeit |
| **SMS und E-Mail werden nur erzeugt, nicht versendet** (Outbox-Tabelle) | Keine externen Dienste | Ein Versanddienst liest später dieselbe Outbox (Outbox-Pattern) |
| **Frontend in React = SPA mit Vite** | Strenge Lesart der Vorgabe | Im Team wäre das eine gemeinsame Architekturentscheidung |
| **Keine Auth, keine Mandanten im Code** | Laut Aufgabe nicht erwartet [F] | Siehe 6.3 und ARCHITECTURE.md |
| **Ein IT-Notfallkonzept existiert** | Nicht Kern der Demo | Notfallliste und Ausformulierung sind optional (Soll) |

### 6.2 Entscheidungen im Prototyp

| Entscheidung | Warum |
|---|---|
| **Drei Postgres-Schemas:** `stamm` (unsere Stammdaten), `termino` (Mock des externen Tools), `ausfall` (Entscheidungen, Outbox) | Klare Verantwortung. Jedes Schema hat genau einen Schreiber |
| **Schutz vor Überschneidung in der Datenbank:** Exclusion Constraint (`btree_gist`) auf Therapeut:in und Zeitraum, nur für gebuchte Termine | Doppelbuchungen sind unmöglich, egal ob Empfang, Autopilot oder Patient:in bucht. Im Code sind keine Race Conditions zu bedenken |
| **`TerminoClient` als Interface**, heute die Mock-Implementierung | Die echte API ist ein austauschbarer Adapter und ein Beispiel für die Integrationsschicht in 6.3 |
| **Autopilot als reine Funktion ohne Speicherung** | Er rechnet bei jedem Abruf neu. Neue Buchungen, Stornos und Selbstbuchungen fließen automatisch ein. Gut testbar mit den echten Daten ohne Datenbank |
| **Nur Entscheidungen des Empfangs werden gespeichert** | Nachvollziehbar, wer was entschieden hat. Grundlage für ein späteres Audit-Log |
| **Speichern in UTC, Anzeige in `Europe/Berlin`** | Die Daten liegen in UTC [F]. Das vermeidet Fehler bei der Sommerzeitumstellung |
| **Export-Toggle 08:00 ↔ 08:05** fasst nur Termine aus dem Export an, eigene Buchungen bleiben. Kollisionen werden als Konflikt gemeldet | Simuliert externe Änderungen ehrlich, ohne eigene Entscheidungen zu überschreiben |
| **Seed beim Start idempotent, dazu `POST /api/sim/reset`** | Ein Befehl startet alles, und die Demo ist beliebig oft wiederholbar |
| **Typen zwischen api und web bewusst dupliziert** | Kein Shared-Package in 3 Stunden. Als nächster Schritt kommt die Generierung aus einem OpenAPI-Schema |
| **Monorepo mit getrennten Containern** (`db`, `api`, `web`) | Entspricht dem späteren Schnitt der Services |

### 6.3 Zielbild für 100+ Praxen (Details in ARCHITECTURE.md)

| Eckpfeiler | Kernaussage |
|---|---|
| Mandantenmodell | Eine gemeinsame DB, `tenant_id` in jeder Tabelle, Postgres Row-Level-Security. Große Partner bekommen optional eine eigene DB |
| Integrationsschicht | Ein Adapter pro Buchungs- und Praxissoftware, Webhook oder Polling → Inbox, Idempotenz, Outbox für Schreibzugriffe |
| Autopilot | Zustandsloser Domänenservice. Regeln (Fristen, Schwellen, Gewichte) pro Mandant konfigurierbar und versioniert |
| Benachrichtigungen | Eigener Service mit Queue, Vorlagen pro Mandant, Kanalpräferenz und Opt-in |
| DSGVO und Gesundheitsdaten | Hosting in der EU, Verschlüsselung, Audit-Log, Rollen pro Standort, Löschkonzept |
| Betrieb | Observability pro Mandant, Feature-Flags, Pilot an einem Standort, Notfallliste offline |

## 7. Todos und nächste Schritte

Stand: 22:30. Status: ✅ erledigt, 🔜 als Nächstes, ⬜ offen. Die Liste enthält alles, was im Gespräch genannt wurde.

| Todo | Wer | Status | Hinweis |
|---|---|---|---|
| Playwright-Testfälle für die wichtigsten Fälle (**Prio**) | [Du] | ✅ | 14 Fälle, je ein Test pro Loom-Fall, Video und Trace sind an |
| Krankmeldung verlängern (falls Anna mittags nicht besser) | [Du] | ✅ | Button „Krankmeldung verlängern“, Entscheidungen bleiben, Reset nimmt sie zurück |
| Countdown und automatischer Refresh alle 5 Minuten | [Du] | ✅ | per Playwright mit vorgespielter Uhr getestet |
| Button „Simuliere: Patient:in bucht selbst“ | [Claude] | 🔜 | Task 12, zeigt „✓ selbst gebucht, kein Anruf nötig“ |
| Notfallliste (druckbar) und IT-Notfallkonzept / Rollback | [Du] | ⬜ | Task 14, optional; bis dahin gilt Annahme „Konzept existiert“ |
| `data/diagnosegruppen.json` mit belegter Quelle (ICD-10, heilmittelkatalog.de) | [Du] | ⬜ | Task 13, nachrangig, Bedeutung der Kürzel darf nicht erfunden werden |
| CI mit GitHub Actions, `npm audit`, Security-Scans | [Du] | ⬜ | Task 16; lokal bereits geprüft: `npm audit` meldet 0 Schwachstellen |
| Sicherheits-Ergänzungen: gitleaks, Dependabot, Trivy (Image), hadolint | [Claude] | ⬜ | Teil von Task 16 |
| Accessibility-Check mit axe in den Playwright-Tests | [Claude] | ⬜ | für den hektischen Empfang sinnvoll |
| Ausführungsmethode des Plans | [Du] | ✅ | Native, vor jedem Merge Tests und Diff-Review |

**Weitere Ideen für „Nächste Schritte“ (nicht gebaut, in der README genannt):**

- Echte Termino-API statt Mock, Webhooks statt Polling.
- Warteliste und Nachbelegung von Annas frei gewordenen Slots (Nordstern: Auslastung).
- Kanalpräferenz und Opt-in der Patient:innen (DSGVO), echter Versand von SMS und E-Mail.
- Audit-Log: wer hat wann welchen Fall entschieden (heute gibt es keine Nutzer).
- Kennzahlen: Zeit, bis alle Betroffenen informiert sind, Anteil erfolgreich umgebucht, Anrufe pro Ausfall.
- Generierte Typen aus einem OpenAPI-Schema statt duplizierter Typen.

**Offene Produktfragen an meinphysio+ (für das Gespräch mit dem CTO):**

- Hat Termino eine Schreib-API, und wie schnell ist sie? (Annahme 1)
- Wie wird heute zwischen Standorten umgebucht, und wer darf das?
- Wie wird die Dringlichkeit klinisch eingeschätzt? Die Diagnosegruppe reicht dafür nicht.
- Stellschrauben, die der Empfang selbst einstellen sollte: 60-Minuten-Fenster für die Anrufreihenfolge (Cem in 80 Minuten wird nach Renate angerufen), Absage-Schwelle von 2 Tagen, Fristfenster von 3 Tagen.

**Abschluss (Reihenfolge):** Tests und `docker compose up` einmal frisch prüfen → README-Stand aktualisieren → Session mit `/export` sichern → Loom aufnehmen (Playwright-Lauf mit `SLOW_MO=400 npm run test:headed` als Drehbuch) → abgeben.

## 8. Loom-Leitfaden (maximal 5 Minuten, mit Notizen)

**0:00–0:30 · Problem.** Zeigen: Aufgabe, Fallliste mit 14 Terminen.
- Montag, 07:40, Anna krank, der erste Termin ist um 08:00: Der Empfang hat Minuten, keine Stunden.
- Heute: Lücken, Qualifikation und Verordnungsfristen von Hand suchen. Ziel: Der Empfang telefoniert und bestätigt.

**0:30–1:30 · Datenfallen.** Zeigen: Tabelle in Abschnitt 3, Karten von Marek, Katrin, Lena.
- Zeiten sind UTC, Marek ist doppelt gebucht, Katrin Meier ist Meyer, Lena fehlt in den Stammdaten, Gisela hat keine Nummer.
- Haltung: Nichts still übergehen. Jeder Datenfehler wird sichtbar und, wo möglich, mit einem Klick behoben (Zusammenführen).

**1:30–2:30 · Produktbrille.** Zeigen: Fallkarten, Sortierung Autopilot ↔ Uhrzeit.
- Zwei Reihenfolgen: Slots nach Priorität, Anrufe nach Dringlichkeit (Sabine um 08:00 zuerst).
- Harte Fristen vor „gefühlter“ Dringlichkeit: Cem und Renate, sonst verfällt die Verordnung. „Frisch operiert“ steht nicht in den Daten, die Diagnose ist nur Tie-Breaker.
- Slots werden gemeinsam verteilt, damit niemand denselben Slot bekommt. „✓ gleiche Uhrzeit“ bleibt erhalten (Kerstin).
- Ersatzlos absagbar, wenn der nächste Termin nah ist (Jan), das spart knappe Kapazität.

**2:30–3:30 · Live.** Zeigen: Bestätigen bei Kerstin, Outbox, Zusammenführen bei Katrin, Toggle 08:05, Krankmeldung verlängern.
- Bestätigen bucht in einem simulierten Termino, die Datenbank verhindert Überschneidungen (Doppelklick ergibt 409).
- Toggle 08:05: Sofias Slot Mi 09:20 wird frei und erscheint für Cem. Auto-Refresh alle 5 Minuten mit Countdown.
- Verlängern: Geht es Anna mittags nicht besser, kommen ihre Termine von Dienstag dazu.

**3:30–4:15 · Arbeit mit dem Agenten.** Zeigen: Abschnitte 4 und 5, `docs/superpowers/`, Playwright-Bericht.
- Erst Problem und Daten, dann Design in Abschnitten mit meiner Freigabe, dann Spec und Plan, dann TDD in Worktrees.
- Wo ich dem Agenten widersprochen habe: Priorisierung, Termino-Schreibzugriff, Verlängern als Soll.
- Wo der Agent mir widersprochen hat: klinische Dringlichkeit, Fristen, Slots gemeinsam verteilen.
- Playwright-Fälle sind zugleich das Drehbuch.

**4:15–5:00 · Annahmen, Weggelassenes, Skalierung.** Zeigen: README (Annahmen, Nächste Schritte), ARCHITECTURE.md.
- Wichtigste Annahme: Termino hat eine Schreib-API. Weggelassen: echter Versand, Selbstbuchungsseite, Warteliste, Auth.
- 100+ Praxen: gemeinsame DB mit `tenant_id` und Row-Level-Security, Adapter pro Buchungstool mit Inbox/Outbox, Autopilot zustandslos mit Regeln pro Mandant, Benachrichtigungsservice, DSGVO.
- Schluss: Was ich als Nächstes bauen würde (Nachbelegung, Opt-in, Kennzahlen).
