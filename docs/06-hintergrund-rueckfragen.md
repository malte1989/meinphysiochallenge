# Hintergrund für Rückfragen

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [5 Loom](05-loom-leitfaden.md) · [6 Hintergrund](06-hintergrund-rueckfragen.md)

Nicht für das Video, sondern für Rückfragen im Gespräch. Der Ablauf für die Aufnahme steht im [Loom-Leitfaden](05-loom-leitfaden.md).

**Was der Toggle 08:05 ändert** (Export von 08:00:41 auf 08:05:41, 1927 → 1928 Termine). Keiner der drei Termine gehört zu Annas Patient:innen:
- Julia Conrad bei Sofia, Mi 09.09. 09:20: storniert, Slot frei.
- Helga Yildiz bei Tobias: von Di 08.09. 09:00 auf 13:40 verschoben, 09:00 frei, 13:40 belegt.
- Georg Unger bei Jonas, Fr 11.09. 10:20: neu gebucht, Slot belegt.
- Wirkung: Keiner der 14 Vorschläge ändert sich. Neu bei den Alternativen: Di 08.09. 09:00 (Tobias) und Mi 09.09. 09:20 (Sofia). Weg: Di 08.09. 13:40 (Tobias) und Fr 11.09. 10:20 (Jonas).
- Technik: Der Export wird in einer Transaktion eingespielt, nur Export-Termine werden angefasst, eigene Buchungen bleiben. Kollisionen werden übersprungen und als Konflikt gemeldet. Danach rechnet der Autopilot alles neu.
- Ehrlich: Der Toggle ändert keinen Vorschlag und simuliert keine Selbstbuchung von Annas Patient:innen. Dafür gibt es den Demo-Button. Idee: Meldung „Was hat sich geändert“.

**Zwei Schutzebenen, nicht verwechseln:** Die Datenbank (Überschneidungsschutz) verhindert, dass ein Slot zweimal **gebucht** wird, erst beim Bestätigen, Antwort 409. Die gemeinsame Berechnung verhindert, dass zwei Personen denselben Slot **vorgeschlagen** bekommen. Ohne sie würde der Empfang die zweite Person anrufen und beim Bestätigen einen 409 bekommen: ein verschwendeter Anruf. Nachweis: Unit-Test „kein Slot wird doppelt vergeben“. Schon vorgeschlagene Slots stehen im „Anderen Slot“ mit „Vorschlag für …“ und bleiben wählbar.

**Gleiche Uhrzeit:** Ein Slot, der für einen anderen Fall genau dessen Originaluhrzeit wäre, wird nicht an jemanden vergeben, der gleichwertig ausweichen kann (Kerstin behält 09:20, Cem weicht aus).

**Zeit hebt die Stufe an (beschlossen, offen):** Sabine würde „Hoch“ und bekäme ihren Slot vor den Normal-Fällen, Frist bleibt darüber. Zu klären: Soll die Zeit auch Lena („Prüfen“) heben, und der Grenzwert „1 Stunde“ sollte mit dem 60-Minuten-Fenster der Anrufreihenfolge eine gemeinsame Einstellung sein. Offen: Cem (in 80 Minuten) wird heute nach Renate angerufen.

**Fristen [Q]:** Behandlungsbeginn innerhalb von 28 Tagen nach Ausstellung, Unterbrechung höchstens 14 Tage. Quellen: [AOK](https://www.aok.de/gp/heilmittel-richtlinie-vertragszahnaerzte/beginn-und-gueltigkeit-der-verordnung-neu-geregelt), [heilmittelkatalog.de](https://heilmittelkatalog.de/aenderungen/heilmittelrichtlinie-01-01-2021/). „Frist 14.09. (Unterbrechung)“ heißt: Bis dahin muss die nächste Behandlung stattfinden, sonst kann die Verordnung verfallen.

**„Jetzt aktualisieren“:** Lädt Fälle, Vorschläge und Outbox sofort neu, ohne die 5 Minuten abzuwarten, und berechnet die Vorschläge aus dem aktuellen Termino-Stand neu.
