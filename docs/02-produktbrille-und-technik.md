# Produktbrille und Technik

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [5 Loom](05-loom-leitfaden.md)

Kennzeichnung: **[Du]** Entscheidung oder Korrektur von Malte, **[Claude]** Vorschlag oder Befund des Agenten, **[F]** Fakt aus Daten oder Aufgabe, **[A]** Annahme, **[Q]** externe Quelle.


## Produktbrille: die Kernentscheidungen

| Entscheidung | Wer | Begründung |
|---|---|---|
| **Zwei Reihenfolgen:** Slots nach Priorität vergeben, Empfang ruft nach Dringlichkeit an (Start in < 60 Min zuerst) | [Claude], [Du] freigegeben | Sabine Czerny (08:00) muss zuerst angerufen werden, auch wenn sie nicht die höchste Priorität hat |
| **Harte Fristen der Verordnung vor klinischer Dringlichkeit.** Diagnosegruppe nur als gekennzeichneter Tie-Breaker | [Claude] widerspricht der Annahme „frisch operiert/Schmerz“, [Du] akzeptiert | „Frisch operiert“ steht nicht in den Daten. Eine verfallene Verordnung ist nicht abrechenbar und schickt die Patient:in zurück zum Arzt |
| **Verteilung über alle Fälle gemeinsam (greedy nach Priorität)** | [Claude] | Bei etwa 10 freien Slots für 13 Bedarfe würden sonst mehrere Patient:innen denselben Slot vorgeschlagen bekommen |
| **„Ersatzlos absagen“, wenn der nächste Termin ≤ 2 Tage entfernt ist und vor der Frist liegt** | [Du] (Behandlungsfrequenz), [Claude] ergänzt die Fristprüfung | Spart knappe Slots. Cem bleibt ausgenommen |
| **Unsichere Treffer zusammenführbar** statt nur anzeigen | [Du] | Der Empfang soll Datenfehler direkt beheben können |
| **Fehlende Stammdaten sichtbar anzeigen** | [Du] | Nichts still übergehen |
| Selbstbuchungs-Link nicht pauschal an alle | [Claude] schlägt vor | Geringe Priorität könnte den Slot einer Frist-Patient:in wegnehmen. In der Spec nur teilweise umgesetzt: Der Link geht nur bei Absagen raus, nicht bei Umbuchungen |

## Technik und Umfang

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
