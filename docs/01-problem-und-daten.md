# Problem und Daten

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [5 Loom](05-loom-leitfaden.md) · [6 Hintergrund](06-hintergrund-rueckfragen.md)

Kennzeichnung: **[Du]** Entscheidung oder Korrektur von Malte, **[Claude]** Vorschlag oder Befund des Agenten, **[F]** Fakt aus Daten oder Aufgabe, **[A]** Annahme, **[Q]** externe Quelle.

Vorgehen: Erst Aufgabe und Daten lesen, dann mit dem Brainstorming-Skill Problem → Ansätze → Design in Abschnitten, Freigabe durch Malte in jedem Schritt, dann Spec und Plan. Bis dahin gab es bewusst keinen Code.

## Problemerfassung

- **Aufgabe [F]:** Notion-Seite (per API gelesen, weil die Seite per JavaScript rendert). Kernsatz: bewertet wird Urteilsvermögen, „wie du mit unsauberen Daten und Zeitdruck umgehst“. Zeitbox 3 Stunden, nicht fertig ist okay.
- **Vorfall [F]:** Mo 07.09.2026, 07:40, Anna Weber krank, 14 gebuchte Termine an beiden Standorten, erster um 08:00.
- **Problem:** Der Empfang muss unter Zeitdruck für jeden Termin entscheiden (umbuchen, absagen, informieren) und sucht dafür heute von Hand Lücken, Qualifikation und Verordnungsfristen.
- **Erfolg:** Der Empfang telefoniert nur noch und bestätigt, er sucht nicht mehr.

## Was in den Daten steckt

| # | Befund | Folge fürs Design |
|---|---|---|
| 1 | Zeiten in UTC (`06:00Z` = 08:00 Berlin) | Anzeige in Berliner Zeit |
| 2 | Marek Kowalski hat zwei Termine am selben Tag, Verordnung 1×/Woche | Warnung „Doppelbuchung?“ |
| 3 | „Katrin Meier“ (Termino) ist „Katrin Meyer“ in den Stammdaten, nicht verknüpft | unsicherer Treffer, **zusammenführbar** |
| 4 | Lena Krause fehlt in den Stammdaten | sichtbare Warnung „Stammdaten fehlen“ |
| 5 | Cem Öztürk: Behandlungsbeginn-Frist 09.09., nächster Termin erst 10.09. | höchste Priorität, nie „ersatzlos absagen“ |
| 6 | Renate Vogel: 14-Tage-Unterbrechungsfrist endet 09.09. | höchste Priorität |
| 7 | Gisela Neumann (Jg. 1949) ohne Telefonnummer | „nicht anrufbar“, nur E-Mail |
| 8 | Kalender fast voll, Meltem ist einzige MLD45 in Kreuzberg, kein freies MT in Kreuzberg | Vorschläge müssen über alle Fälle gemeinsam berechnet werden |
| 9 | Diff 08:00 → 08:05: nur drei Termine ändern sich (Storno Mi 09.09. 09:20 bei Sofia, Verschiebung bei Tobias, Neubuchung bei Jonas), keiner gehört zu Annas Patient:innen | ändert nur die **Alternativen** unter „Anderer Slot“, nicht die Vorschläge. Der frei gewordene Mittwoch-Slot ist für Cem neu wählbar |
| 10 | `prac_03` fehlt in den Stammdaten, MLD „45 Min.“ ist mit 40 Min. gebucht, Peter Albrecht ist schon storniert | nur Hinweis in der README |

Fristen [Q]: [AOK](https://www.aok.de/gp/heilmittel-richtlinie-vertragszahnaerzte/beginn-und-gueltigkeit-der-verordnung-neu-geregelt), [heilmittelkatalog.de](https://heilmittelkatalog.de/aenderungen/heilmittelrichtlinie-01-01-2021/)
