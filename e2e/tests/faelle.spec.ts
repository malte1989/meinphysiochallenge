import { expect, test, type Page } from '@playwright/test';

// Jeder Test ist ein Fall aus dem Loom. Vor jedem Test wird die Demo zurückgesetzt (Exportstand 08:00).
test.beforeEach(async ({ page, request }) => {
  expect((await request.post('/api/sim/reset')).ok()).toBeTruthy();
  await page.goto('/');
  await page.waitForSelector('[data-testid=fall]');
});

const karte = (page: Page, name: string) => page.locator(`[data-testid=fall][data-patient="${name}"]`);

test('Überblick: 14 Fälle, Anrufreihenfolge beginnt mit Sabine Czerny (08:00) und Lena Krause (08:20)', async ({ page }) => {
  await expect(page.getByTestId('fall')).toHaveCount(14);
  const namen = await page.getByTestId('fall').evaluateAll((els) => els.map((e) => e.getAttribute('data-patient')));
  expect(namen.slice(0, 2)).toEqual(['Sabine Czerny', 'Lena Krause']);
  await expect(page.getByText('14 offen')).toBeVisible();
});

test('Sortierung nach Uhrzeit: aufsteigend von 08:00 bis 17:00', async ({ page }) => {
  await page.getByRole('button', { name: 'Uhrzeit', exact: true }).click();
  const zeiten = await page.locator('.uhrzeit').allTextContents();
  expect(zeiten).toEqual([...zeiten].sort());
  expect(zeiten[0]).toBe('08:00');
  expect(zeiten.at(-1)).toBe('17:00');
});

test('Frist: Cem und Renate sind rot markiert und nennen den 09.09.', async ({ page }) => {
  for (const name of ['Cem Oeztuerk', 'Renate Vogel']) {
    const k = karte(page, name);
    await expect(k).toHaveClass(/stufe-frist/);
    await expect(k.locator('.chip', { hasText: 'Frist 09.09.' })).toBeVisible();
  }
});

test('Gleiche Uhrzeit: Kerstin bekommt Jonas 09:20 vorgeschlagen, Bestätigen erzeugt SMS und E-Mail', async ({ page }) => {
  const k = karte(page, 'Kerstin Nowak');
  await expect(k.locator('.vorschlag')).toContainText('09:20');
  await expect(k.locator('.vorschlag')).toContainText('Jonas Brandt');
  await expect(k.getByText('✓ gleiche Uhrzeit')).toBeVisible();
  await k.getByRole('button', { name: 'Bestätigen' }).click();
  await expect(k.locator('.status')).toHaveText('✓ umgebucht');
  await page.getByRole('button', { name: /Outbox/ }).click();
  await expect(page.locator('.nachricht')).toHaveCount(2);
  await expect(page.locator('.nachricht').first()).toContainText('Kerstin');
});

test('Ersatzlos absagen: Jan Ahrens hat am Mi 09.09. schon den nächsten Termin', async ({ page }) => {
  const k = karte(page, 'Jan Ahrens');
  await expect(k.locator('.chip', { hasText: 'nächster Termin Mi 09.09.' })).toBeVisible();
  await expect(k.getByRole('button', { name: 'Bestätigen' })).toHaveCount(0);
  await k.getByRole('button', { name: 'Ersatzlos absagen' }).click();
  await expect(k.locator('.status')).toHaveText('✓ abgesagt');
  await page.getByRole('button', { name: /Outbox/ }).click();
  await expect(page.locator('.nachricht').first()).toContainText('entfällt');
});

test('Doppelbuchung: Marek Kowalski steht zweimal, der spätere Termin wird zur Stornierung empfohlen', async ({ page }) => {
  const mareks = karte(page, 'Marek Kowalski');
  await expect(mareks).toHaveCount(2);
  const um = (hhmm: string) => mareks.filter({ has: page.locator('.uhrzeit', { hasText: hhmm }) });
  await expect(um('16:20').getByRole('button', { name: 'Doppelbuchung stornieren' })).toBeVisible();
  await expect(um('10:00').getByRole('button', { name: 'Doppelbuchung stornieren' })).toHaveCount(0);
  await expect(um('10:00').locator('.chip.doppelbuchung')).toBeVisible();
});

test('Unsicherer Treffer: Katrin Meier ↔ Meyer lässt sich zusammenführen', async ({ page }) => {
  const k = karte(page, 'Katrin Meier');
  await expect(k.locator('.match')).toContainText('Meyer');
  await k.getByRole('button', { name: 'Zusammenführen' }).click();
  await expect(k.locator('.match')).toHaveCount(0);
  await expect(k.locator('.chip.identitaet_pruefen')).toHaveCount(0);
});

test('Stammdaten fehlen: Lena Krause wird deutlich gewarnt', async ({ page }) => {
  await expect(karte(page, 'Lena Krause').locator('.chip.stammdaten_fehlen')).toContainText('Stammdaten fehlen');
});

test('Keine Telefonnummer: Gisela Neumann bekommt nur eine E-Mail mit Link', async ({ page }) => {
  const k = karte(page, 'Gisela Neumann');
  await expect(k.getByText('keine Nummer')).toBeVisible();
  await k.getByRole('button', { name: 'Absagen mit Link' }).click();
  await expect(k.locator('.status')).toHaveText('✓ abgesagt');
  await page.getByRole('button', { name: /Outbox/ }).click();
  await expect(page.locator('.nachricht')).toHaveCount(1);
  await expect(page.locator('.nachricht')).toContainText('✉️ E-Mail');
  await expect(page.locator('.nachricht')).toContainText('termino.example/buchen');
});

test('Toggle 08:05: Sofias frei gewordener Slot Mi 09.09. 09:20 erscheint für Cem', async ({ page }) => {
  const k = karte(page, 'Cem Oeztuerk');
  const sofia = () => page.locator('.slot-tag', { hasText: 'Mi 09.09.' }).getByText('09:20 · Sofia Lindqvist');
  await k.getByRole('button', { name: 'Anderer Slot' }).click();
  await expect(page.locator('.slotpicker .slot').first()).toBeVisible();
  await expect(sofia()).toHaveCount(0);
  await k.getByRole('button', { name: 'schließen' }).click();

  await page.getByRole('button', { name: '08:05', exact: true }).click();
  await expect(page.getByRole('button', { name: '08:05', exact: true })).toHaveClass(/aktiv/);
  await k.getByRole('button', { name: 'Anderer Slot' }).click();
  await expect(sofia()).toBeVisible();
});

test('Doppelklick: zwei gleichzeitige Umbuchungen buchen nur einmal, die zweite bekommt 409', async ({ request }) => {
  const [a] = await (await request.get('/api/ausfall')).json();
  const { faelle } = await (await request.get(`/api/ausfall/${a.id}/faelle`)).json();
  const f = faelle.find((x: any) => x.appointment.patient.name === 'Kerstin Nowak');
  const body = { practitionerId: f.vorschlag.practitionerId, startsAt: f.vorschlag.startsAt };
  const antworten = await Promise.all([
    request.post(`/api/faelle/${f.appointment.id}/umbuchen`, { data: body }),
    request.post(`/api/faelle/${f.appointment.id}/umbuchen`, { data: body }),
  ]);
  expect(antworten.map((r) => r.status()).sort()).toEqual([200, 409]);
  expect((await (await request.get('/api/outbox')).json()).length).toBe(2);
});

test('Countdown: zeigt die Zeit bis zum nächsten Update und springt nach „Jetzt aktualisieren“ zurück', async ({ page }) => {
  await expect(page.locator('.countdown')).toHaveText(/nächstes Update in (4:5\d|5:00)/);
  await page.clock.install();
  await page.reload();
  await page.waitForSelector('[data-testid=fall]');
  await page.clock.fastForward('02:00');
  await expect(page.locator('.countdown')).toHaveText(/nächstes Update in 2:5\d|3:00/);
  await page.getByRole('button', { name: 'Jetzt aktualisieren' }).click();
  await expect(page.locator('.countdown')).toHaveText(/nächstes Update in (4:5\d|5:00)/);
});

test('Automatischer Refresh: nach 5 Minuten fragt die Oberfläche die Fälle selbst neu ab', async ({ page }) => {
  await page.clock.install();
  await page.reload();
  await page.waitForSelector('[data-testid=fall]');
  const anfrage = page.waitForRequest((r) => r.url().includes('/faelle'));
  await page.clock.fastForward('05:01');
  await anfrage;
});

test('Krankmeldung verlängern: geht es Anna mittags nicht besser, kommen ihre Termine von Dienstag dazu', async ({ page }) => {
  await expect(page.getByText('14 offen')).toBeVisible();
  await page.getByRole('button', { name: 'Krankmeldung verlängern' }).click();
  await page.getByRole('button', { name: 'bis Di 08.09.' }).click();
  await expect(page.getByTestId('fall')).not.toHaveCount(14);
  await expect(page.locator('.karte-kopf .tag', { hasText: 'Di 08.09.' }).first()).toBeVisible();
});

test('Selbstbuchung: bucht Cem selbst, ist kein Anruf mehr nötig', async ({ page }) => {
  const k = karte(page, 'Cem Oeztuerk');
  await k.getByRole('button', { name: 'Demo: Patient:in bucht selbst' }).click();
  await expect(k.locator('.status')).toHaveText('✓ selbst gebucht, kein Anruf nötig');
  await expect(page.getByText('13 offen')).toBeVisible();
});

test('Diagnosegruppe im Klartext: Sabine Czerny (EX2) zeigt „Extremitäten“ mit Quelle im Tooltip', async ({ page }) => {
  const chip = karte(page, 'Sabine Czerny').locator('.chip.diagnose');
  await expect(chip).toContainText('EX2');
  await expect(chip).toContainText('Extremitäten');
  await expect(chip).toHaveAttribute('title', /https:\/\//);
});

test('Notfallliste: druckbare Anrufliste in Anrufreihenfolge, wenn Termino oder unser Service ausfällt', async ({ page }) => {
  await page.getByRole('button', { name: 'Notfallliste' }).click();
  await expect(page).toHaveURL(/#druck$/);
  await expect(page.getByRole('heading', { name: /Notfallliste/ })).toBeVisible();
  const zeilen = page.locator('.notfall tbody tr');
  await expect(zeilen).toHaveCount(14);
  await expect(zeilen.nth(0)).toContainText('Sabine Czerny');
  await expect(zeilen.nth(0)).toContainText('+49 151 55011007');
  await expect(page.locator('.notfall').getByText('keine Nummer').first()).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zur Oberfläche' }).click();
  await expect(page.getByTestId('fall').first()).toBeVisible();
});

test('Notfallliste ist direkt über #druck erreichbar (z. B. als Lesezeichen)', async ({ page }) => {
  await page.goto('/#druck');
  await expect(page.locator('.notfall tbody tr')).toHaveCount(14);
});
