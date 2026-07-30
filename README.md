# Case Study "Der Ausfall": Daten

Dieses Repository enthält die Datengrundlage für die Case Study "Der Ausfall" von meinphysio+. Die Aufgabenstellung bekommst du separat.

Alle Personen und Daten sind fiktiv.

## Dateien

### `data/praxen.json`

Unsere beiden Standorte.

| Feld | Bedeutung |
| --- | --- |
| `id` | interne ID |
| `name`, `adresse` | Standort |
| `termino_location_id` | ID des Standorts in Termino, unserem Buchungstool |

### `data/therapeuten.json`

Unser Team.

| Feld | Bedeutung |
| --- | --- |
| `id` | interne ID |
| `vorname`, `nachname` | Name |
| `qualifikationen` | Leistungen, die die Person abgeben darf: `KG` (Krankengymnastik), `MT` (Manuelle Therapie), `MLD45` (Manuelle Lymphdrainage, 45 Min.), `KGG` (gerätegestützte Krankengymnastik) |
| `arbeitszeiten` | Arbeitsintervalle je Wochentag (`mo` bis `fr`), Pausen sind ausgespart. `praxis_id` verweist auf `praxen.json` |
| `termino_practitioner_id` | ID der Person in Termino |

### `data/patienten.json`

Patientenstammdaten aus unserer Verwaltung.

| Feld | Bedeutung |
| --- | --- |
| `id` | interne ID |
| `vorname`, `nachname`, `geburtsdatum` | Person |
| `telefon`, `email` | Kontaktdaten, soweit vorhanden |
| `termino_patient_id` | ID des Patientendatensatzes in Termino, falls verknüpft |

### `data/verordnungen.json`

Ärztliche Heilmittelverordnungen (Rezepte), auf deren Basis behandelt wird.

| Feld | Bedeutung |
| --- | --- |
| `id` | interne ID |
| `patient_id` | verweist auf `patienten.json` |
| `ausstellungsdatum` | Datum, an dem die Ärztin die Verordnung ausgestellt hat |
| `diagnosegruppe` | Diagnosegruppe laut Verordnung |
| `heilmittel` | verordnete Leistung (Codes wie oben) |
| `verordnungsmenge` | Anzahl verordneter Behandlungseinheiten |
| `frequenz_pro_woche` | empfohlene Behandlungsfrequenz |

### `data/termino_export_2026-09-07_0800.json` und `..._0805.json`

Gebucht wird bei uns in Termino, einem externen Buchungstool. Termino stellt alle 5 Minuten einen vollständigen Export aller Termine im Fenster von zwei Wochen zurück bis eine Woche voraus bereit. Hier liegen die beiden Exporte vom Morgen des 7. September 2026.

Struktur je Termin:

| Feld | Bedeutung |
| --- | --- |
| `id` | Termin-ID in Termino |
| `location_id`, `practitioner_id` | Standort und behandelnde Person (Termino-IDs) |
| `service` | gebuchte Leistung (Termino-Bezeichnung) |
| `starts_at`, `duration_min` | Beginn und Dauer |
| `status` | `booked` oder `cancelled` |
| `patient` | Patientendatensatz, wie Termino ihn führt (`id`, `name`, `birth_date`, `phone`, `email`) |
| `booked_at`, `updated_at` | Buchungs- und letzter Änderungszeitpunkt |
