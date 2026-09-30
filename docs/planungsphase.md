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

## 6. Korrekturen und Fehler auf dem Weg (ehrlich)

- Ich habe zuerst „geänderte Datei im Git-Status“ gemeldet, der Arbeitsbaum war aber sauber. Ich hatte mich auf den Anfangs-Snapshot verlassen und danach neu geprüft.
- Ich wollte `develop` anlegen, es existierte schon. Ich habe darauf weitergearbeitet.
- Ich habe „idle cache“ zuerst als „weiter“ gedeutet. Es bedeutet „Cache warmhalten, nichts tun“ und ist jetzt in meinem Gedächtnis.
- Der Plan nannte anfangs Node 22 und setzte Docker voraus. Durch deine Hinweise gilt jetzt Node 24, und Colima läuft.

## 7. Noch offen

- Ausführungsmethode: Native ist empfohlen, aber noch nicht ausdrücklich bestätigt.
- Die Quelle für die Bezeichnungen der Diagnosegruppen (Soll) muss vor der Verwendung nachgeschlagen werden, nichts wird erfunden.
- Kein Push, nichts ist veröffentlicht.

## 8. Loom-Leitfaden (maximal 5 Minuten)

| Zeit | Inhalt | Zeigen |
|---|---|---|
| 0:00–0:30 | Problem in einem Satz, Zeitdruck um 07:40 | Aufgabe, Fallliste der 14 Termine |
| 0:30–1:30 | Datenfallen und was sie für das Design bedeuten (UTC, Doppelbuchung, Meier/Meyer, Cems Frist) | Tabelle in Abschnitt 3 |
| 1:30–2:30 | **Produktbrille:** zwei Reihenfolgen, Fristen vor klinischer Dringlichkeit, Slots gemeinsam verteilen | Fallkarten in der Oberfläche |
| 2:30–3:30 | Live: Bestätigen, Outbox, unsicherer Treffer zusammenführen, Toggle 08:05 | Oberfläche |
| 3:30–4:15 | Wie ich mit dem Agenten gearbeitet habe: Skill, Freigaben, Korrekturen, Worktrees | Abschnitte 4–6 |
| 4:15–5:00 | Weggelassenes, nächste Schritte, Skalierung auf 100+ Praxen | README, ARCHITECTURE.md |
