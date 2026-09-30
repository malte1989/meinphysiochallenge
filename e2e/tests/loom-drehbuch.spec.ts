import { expect, test } from '@playwright/test';

// Ein durchgehender Ablauf in Loom-Reihenfolge. Zum Vorführen langsam starten:
//   npm run test:drehbuch          (sichtbarer Browser, Tempo per SLOW_MO und PAUSE in ms einstellbar)
//   npm run test:ui                (Playwright UI-Modus mit Zeitleiste, ebenfalls langsam)
const pause = (ms = Number(process.env.PAUSE ?? 0)) => new Promise((r) => setTimeout(r, ms));

test('Drehbuch: Der Ausfall in der Reihenfolge des Loom', async ({ page, request }) => {
  expect((await request.post('/api/sim/reset')).ok()).toBeTruthy();
  const karte = (name: string) => page.locator(`[data-testid=fall][data-patient="${name}"]`);

  await test.step('1 · Problem: 14 Fälle, die Anrufreihenfolge beginnt mit Sabine Czerny', async () => {
    await page.goto('/');
    await expect(page.getByTestId('fall')).toHaveCount(14);
    await expect(page.getByTestId('fall').first()).toHaveAttribute('data-patient', 'Sabine Czerny');
    await pause();
  });

  await test.step('2 · Sortierung: nach Uhrzeit und zurück zum Autopiloten', async () => {
    await page.getByRole('button', { name: 'Uhrzeit', exact: true }).click();
    await expect(page.locator('.uhrzeit').first()).toHaveText('08:00');
    await pause();
    await page.getByRole('button', { name: 'Autopilot (Anrufreihenfolge)' }).click();
    await pause();
  });

  await test.step('3 · Datenfallen: Lena fehlt in den Stammdaten, Gisela hat keine Nummer, Marek ist doppelt', async () => {
    await expect(karte('Lena Krause').locator('.chip.stammdaten_fehlen')).toBeVisible();
    await karte('Lena Krause').scrollIntoViewIfNeeded();
    await pause();
    await expect(karte('Gisela Neumann').getByText('keine Nummer')).toBeVisible();
    await karte('Gisela Neumann').scrollIntoViewIfNeeded();
    await pause();
    await expect(karte('Marek Kowalski')).toHaveCount(2);
    await karte('Marek Kowalski').first().scrollIntoViewIfNeeded();
    await pause();
  });

  await test.step('4 · Produktbrille: Cems Frist 09.09., Kerstin bekommt ihre gleiche Uhrzeit', async () => {
    await expect(karte('Cem Oeztuerk')).toHaveClass(/stufe-frist/);
    await karte('Cem Oeztuerk').scrollIntoViewIfNeeded();
    await pause();
    await expect(karte('Kerstin Nowak').getByText('✓ gleiche Uhrzeit')).toBeVisible();
    await karte('Kerstin Nowak').scrollIntoViewIfNeeded();
    await pause();
  });

  await test.step('5 · Live: Kerstin bestätigen, Outbox zeigen', async () => {
    await karte('Kerstin Nowak').getByRole('button', { name: 'Bestätigen' }).click();
    await expect(karte('Kerstin Nowak').locator('.status')).toHaveText('✓ umgebucht');
    await pause();
    await page.getByRole('button', { name: /Outbox/ }).click();
    await expect(page.locator('.nachricht')).toHaveCount(2);
    await pause();
    await page.locator('.drawer').getByRole('button', { name: 'schließen' }).click();
  });

  await test.step('6 · Katrin: unsicheren Treffer zusammenführen', async () => {
    await karte('Katrin Meier').scrollIntoViewIfNeeded();
    await pause();
    await karte('Katrin Meier').getByRole('button', { name: 'Zusammenführen' }).click();
    await expect(karte('Katrin Meier').locator('.match')).toHaveCount(0);
    await pause();
  });

  await test.step('7 · Jan: ersatzlos absagen, sein nächster Termin ist Mi 09.09.', async () => {
    await karte('Jan Ahrens').scrollIntoViewIfNeeded();
    await pause();
    await karte('Jan Ahrens').getByRole('button', { name: 'Ersatzlos absagen' }).click();
    await expect(karte('Jan Ahrens').locator('.status')).toHaveText('✓ abgesagt');
    await pause();
  });

  await test.step('8 · Toggle 08:05: Sofias frei gewordener Slot erscheint für Cem', async () => {
    await page.getByRole('button', { name: '08:05', exact: true }).click();
    await expect(page.getByRole('button', { name: '08:05', exact: true })).toHaveClass(/aktiv/);
    await karte('Cem Oeztuerk').scrollIntoViewIfNeeded();
    await karte('Cem Oeztuerk').getByRole('button', { name: 'Anderer Slot' }).click();
    await expect(page.locator('.slot-tag', { hasText: 'Mi 09.09.' }).getByText('09:20 · Sofia Lindqvist')).toBeVisible();
    await pause();
    await karte('Cem Oeztuerk').getByRole('button', { name: 'schließen' }).click();
  });

  await test.step('9 · Cem bucht selbst: kein Anruf mehr nötig', async () => {
    await karte('Cem Oeztuerk').getByRole('button', { name: 'Demo: Patient:in bucht selbst' }).click();
    await expect(karte('Cem Oeztuerk').locator('.status')).toHaveText('✓ selbst gebucht, kein Anruf nötig');
    await pause();
  });

  await test.step('10 · Krankmeldung verlängern bis Di 08.09.', async () => {
    await page.getByRole('button', { name: 'Krankmeldung verlängern' }).click();
    await pause();
    await page.getByRole('button', { name: 'bis Di 08.09.' }).click();
    await expect(page.getByTestId('fall')).not.toHaveCount(14);
    await expect(page.locator('.karte-kopf .tag', { hasText: 'Di 08.09.' }).first()).toBeVisible();
    await pause();
  });

  await test.step('11 · Notfallliste zum Drucken und zurück', async () => {
    await page.getByRole('button', { name: 'Notfallliste' }).click();
    await expect(page.getByRole('heading', { name: /Notfallliste/ })).toBeVisible();
    await pause();
    await page.getByRole('button', { name: 'Zurück zur Oberfläche' }).click();
    await expect(page.getByTestId('fall').first()).toBeVisible();
  });
});
