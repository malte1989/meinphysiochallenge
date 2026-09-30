# Todos und nächste Schritte

[Übersicht](planungsphase.md) · [1 Problem und Daten](01-problem-und-daten.md) · [2 Produktbrille und Technik](02-produktbrille-und-technik.md) · [3 Architektur](03-architektur-annahmen.md) · [4 Todos](04-todos-und-naechste-schritte.md) · [5 Loom](05-loom-leitfaden.md)

Was im Gespräch genannt wurde, mit Status. Die kurze Fassung für Leser:innen steht in der [README, Abschnitt „Nächste Schritte“](../README.md#nächste-schritte).

Status: ✅ erledigt, 🔜 als Nächstes, ⬜ offen.

Stand: 22:30.

| Todo | Wer | Status | Hinweis |
|---|---|---|---|
| Playwright-Testfälle für die wichtigsten Fälle (**Prio**) | [Du] | ✅ | 14 Fälle, je ein Test pro Loom-Fall, Video und Trace sind an |
| Krankmeldung verlängern (falls Anna mittags nicht besser) | [Du] | ✅ | Button „Krankmeldung verlängern“, Entscheidungen bleiben, Reset nimmt sie zurück |
| Countdown und automatischer Refresh alle 5 Minuten | [Du] | ✅ | per Playwright mit vorgespielter Uhr getestet |
| Übersichtsseite aller Ausfälle, „zurück“ dorthin, neuen Ausfall einer anderen Person anlegen (**nur gemockt**) | [Du] | ✅ | eigene Seite `#/ausfaelle`, Hauptseite bleibt unverändert; Anlegen erzeugt nur einen Datensatz |
| Button „Demo: Patient:in bucht selbst“ | [Claude] | ✅ | zeigt „✓ selbst gebucht, kein Anruf nötig“, auch nach „Absagen mit Link“ |
| Notfallliste (druckbar) und IT-Notfallkonzept / Rollback | [Du] | ✅ teilweise | Notfallliste gebaut (`/#druck`), Konzept nur als Entwurf in der README, **„Rückgängig“/Rollback nicht gebaut** |
| `data/diagnosegruppen.json` mit belegter Quelle (ICD-10, heilmittelkatalog.de) | [Du] | ✅ teilweise | Gruppenbezeichnung belegt (Zweitquelle), **Ziffernbedeutung nicht gegen G-BA-Primärquelle geprüft**, ICD-10-Zuordnung nicht erhoben; Status steht je Eintrag in der Datei |
| CI mit GitHub Actions, `npm audit`, Security-Scans | [Du] | ✅ teilweise | Workflow und Dependabot geschrieben und lokal validiert, **nie auf GitHub gelaufen**; `npm audit` 0 Schwachstellen | lokal bereits geprüft: `npm audit` meldet 0 Schwachstellen |
| Sicherheits-Ergänzungen: gitleaks, Dependabot, Trivy (Image), hadolint | [Claude] | ✅ teilweise | gitleaks und Dependabot drin, Trivy und hadolint nicht |
| Accessibility-Check mit axe in den Playwright-Tests | [Claude] | ⬜ | für den hektischen Empfang sinnvoll |
| **Design an das meinphysio+-Buchungstool angleichen** (Referenz: [Terminanfrage](https://patient.meinphysioplus.de/terminanfrage), erst nach dem Zurücksetzen des Limits um 23:50) | [Du] | ✅ | Branch `feature/design`: Tokens aus dem Tailwind-Theme des Buchungstools, rechte Seitenleiste, Karten und Pillen; nur Optik, alle 32 Playwright-Tests unverändert grün. Screenshots für den Loom noch offen |
| **Bruno-Requests** als Collection im Repo (`bruno/`) für alle API-Endpunkte | [Du] | ⬜ | git-freundlich, dient zum Ausprobieren und Demonstrieren der API; Umgebung `local` mit `http://localhost:3000` |
| Ausführungsmethode des Plans | [Du] | ✅ | Native, vor jedem Merge Tests und Diff-Review |

**Design-Referenz:** Buchungstool unter https://patient.meinphysioplus.de/terminanfrage (öffentlich erreichbar, Stand beim Anlegen des Todos nicht erneut geprüft). Screenshot liegt bei Malte, bewusst nicht im Repo, weil Fremdmaterial. Merkmale:

- Großer dunkelgrüner Titel, der Fragezeichen-Akzent in Orangerot. Helle, ruhige Fläche, viel Weißraum. Titel in Poppins, Fließtext in DM Sans [Q: Tailwind-Theme des [Buchungstools](https://patient.meinphysioplus.de/terminanfrage), `--font-display` und `--font-sans`].
- Karten mit großem Bild oben, abgerundeten Ecken und dünnem Rand. Die gewählte Karte hat einen dunkelgrünen, kräftigen Rand. Kleine graue Pillen für Hinweise („Termin in 2 Tagen“).
- Rechte Seitenleiste mit Logo und Sprachwahl (DE), darunter ein Schritte-Menü mit Icon-Kacheln. Der aktive Schritt ist hell hinterlegt mit orangeroter Kachel, die übrigen sind grau.
- Unten ein kleiner Vertrauenshinweis („Verschlüsselt · Server in Deutschland · DSGVO“) und das Team des Standorts als Avatare.
- Umsetzung in `web/src/styles.css` über Design-Tokens (Farben, Radien, Schrift), Markenname immer „meinphysio+“. Keine Bilder oder Logos aus dem Fremdmaterial übernehmen, ohne dass Malte sie freigibt.
- **Umgesetzt** (`feature/design`): Farben, Radien und Schatten stammen aus dem Tailwind-Theme des Buchungstools (von Malte bereitgestellt), der Kommentar neben jedem Token nennt den Namen dort, z. B. `--color-accent: #27372a`, `--color-primary: #eb3c00`, `--color-canvas-beige: #d5cfc7`. Die Wortmarke ist Text, das Team erscheint als Initialen. Statt „Verschlüsselt · Server in Deutschland · DSGVO“ steht ein ehrlicher Hinweis („Fiktive Daten · Nachrichten nur simuliert · läuft lokal“), weil der Prototyp lokal läuft. Einen Dark Mode hat das Buchungstool nicht, deshalb ist er entfallen.

**Weitere Ideen für „Nächste Schritte" (nicht gebaut, in der README genannt):**

- Echte Termino-API statt Mock, Webhooks statt Polling.
- Warteliste und Nachbelegung von Annas frei gewordenen Slots (Nordstern: Auslastung).
- Kanalpräferenz und Opt-in der Patient:innen (DSGVO), echter Versand von SMS und E-Mail.
- Audit-Log: wer hat wann welchen Fall entschieden (heute gibt es keine Nutzer).
- **Authentifizierung und Rollen** (heute bewusst nicht gebaut, laut Aufgabe nicht erwartet): drei Gruppen mit getrennten Wegen.
  - **Kunde (Patient:in):** kein Konto nötig. Der Link in SMS und E-Mail enthält ein einmaliges, befristetes, signiertes Token (Magic Link), das nur den eigenen Termin und die eigene Neubuchung freigibt. Optional später ein Portal mit Anmeldung.
  - **Mitarbeiter (Empfang, Therapeut:in, Standortleitung):** Anmeldung über einen Identity Provider (OIDC/OAuth 2.0) mit Zwei-Faktor-Anmeldung. Die Rolle gilt pro Standort: Der Empfang sieht und entscheidet nur Fälle des eigenen Standorts, die Standortleitung sieht ihren Standort mit Eskalationen.
  - **Admin (Mandant bzw. Partner-Praxis):** verwaltet Benutzer, Standorte, Regeln (Fristen, Schwellen, Vorlagen) und sieht das Audit-Log. Ein Plattform-Admin von meinphysio+ verwaltet Mandanten.
  - **Technik:** Das Token trägt Mandant und Rolle. Daraus setzt die API pro Anfrage `tenant_id` für die Postgres Row-Level-Security. Jede Entscheidung wird mit der Benutzerkennung im Audit-Log gespeichert.
- Kennzahlen: Zeit, bis alle Betroffenen informiert sind, Anteil erfolgreich umgebucht, Anrufe pro Ausfall.
- Generierte Typen aus einem OpenAPI-Schema statt duplizierter Typen.

**Offene Produktfragen an meinphysio+ (für das Gespräch mit dem CTO):**

- Hat Termino eine Schreib-API, und wie schnell ist sie? (Annahme 1)
- Wie wird heute zwischen Standorten umgebucht, und wer darf das?
- Wie wird die Dringlichkeit klinisch eingeschätzt? Die Diagnosegruppe reicht dafür nicht.
- Stellschrauben, die der Empfang selbst einstellen sollte: 60-Minuten-Fenster für die Anrufreihenfolge (Cem in 80 Minuten wird nach Renate angerufen), Absage-Schwelle von 2 Tagen, Fristfenster von 3 Tagen.

**Abschluss (Reihenfolge):** Tests und `docker compose up` einmal frisch prüfen → README-Stand aktualisieren → Session mit `/export` sichern → Loom aufnehmen (Playwright-Lauf mit `SLOW_MO=400 npm run test:headed` als Drehbuch) → abgeben.
