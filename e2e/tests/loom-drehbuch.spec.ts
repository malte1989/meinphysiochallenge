import { expect, test, type Page } from '@playwright/test';

// Drehbuch in Loom-Reihenfolge. Jeder Schritt ist ein eigener, unabhängiger Test und in der Playwright-UI einzeln wählbar.
// „0 · Komplettdurchlauf“ spielt alle Schritte nacheinander in einer Sitzung ab.
//   npm run test:drehbuch   sichtbarer Browser, nur der Komplettdurchlauf
//   npm run test:ui         Playwright-UI: Schritte einzeln auswählen
// Tempo in Millisekunden: SLOW_MO (pro Klick) und PAUSE (zwischen den Aktionen).
test.describe.configure({ timeout: 15 * 60_000 });

const pause = (ms = Number(process.env.PAUSE ?? 0)) => new Promise((r) => setTimeout(r, ms));
const karte = (page: Page, name: string) => page.locator(`[data-testid=fall][data-patient="${name}"]`);

const schritte: { name: string; lauf: (page: Page) => Promise<void> }[] = [
  {
    name: '1 · Problem: 14 Fälle, die Anrufreihenfolge beginnt mit Sabine Czerny',
    lauf: async (page) => {
      await expect(page.getByTestId('fall')).toHaveCount(14);
      await expect(page.getByTestId('fall').first()).toHaveAttribute('data-patient', 'Sabine Czerny');
      await pause();
    },
  },
  {
    name: '2 · Sortierung: nach Uhrzeit und zurück zum Autopiloten',
    lauf: async (page) => {
      await page.getByRole('button', { name: 'Uhrzeit', exact: true }).click();
      await expect(page.locator('.uhrzeit').first()).toHaveText('08:00');
      await pause();
      await page.getByRole('button', { name: 'Autopilot (Anrufreihenfolge)' }).click();
      await pause();
    },
  },
  {
    name: '3 · Datenfallen: Lena fehlt in den Stammdaten, Gisela hat keine Nummer, Marek ist doppelt',
    lauf: async (page) => {
      await expect(karte(page, 'Lena Krause').locator('.chip.stammdaten_fehlen')).toBeVisible();
      await karte(page, 'Lena Krause').scrollIntoViewIfNeeded();
      await pause();
      await expect(karte(page, 'Gisela Neumann').getByText('keine Nummer')).toBeVisible();
      await karte(page, 'Gisela Neumann').scrollIntoViewIfNeeded();
      await pause();
      await expect(karte(page, 'Marek Kowalski')).toHaveCount(2);
      await karte(page, 'Marek Kowalski').first().scrollIntoViewIfNeeded();
      await pause();
    },
  },
  {
    name: '4 · Produktbrille: Cems Frist 09.09., Kerstin bekommt ihre gleiche Uhrzeit',
    lauf: async (page) => {
      await expect(karte(page, 'Cem Oeztuerk')).toHaveClass(/stufe-frist/);
      await karte(page, 'Cem Oeztuerk').scrollIntoViewIfNeeded();
      await pause();
      await expect(karte(page, 'Kerstin Nowak').getByText('✓ gleiche Uhrzeit')).toBeVisible();
      await karte(page, 'Kerstin Nowak').scrollIntoViewIfNeeded();
      await pause();
    },
  },
  {
    name: '5 · Live: Kerstin bestätigen, Outbox zeigen',
    lauf: async (page) => {
      await karte(page, 'Kerstin Nowak').scrollIntoViewIfNeeded();
      await karte(page, 'Kerstin Nowak').getByRole('button', { name: 'Bestätigen' }).click();
      await expect(karte(page, 'Kerstin Nowak').locator('.status')).toHaveText('✓ umgebucht');
      await pause();
      await page.getByRole('button', { name: /Outbox/ }).click();
      await expect(page.locator('.nachricht')).toHaveCount(2);
      await pause();
      await page.locator('.drawer').getByRole('button', { name: 'schließen' }).click();
    },
  },
  {
    name: '6 · Katrin: unsicheren Treffer zusammenführen',
    lauf: async (page) => {
      await karte(page, 'Katrin Meier').scrollIntoViewIfNeeded();
      await pause();
      await karte(page, 'Katrin Meier').getByRole('button', { name: 'Zusammenführen' }).click();
      await expect(karte(page, 'Katrin Meier').locator('.match')).toHaveCount(0);
      await pause();
    },
  },
  {
    name: '7 · Jan: ersatzlos absagen, sein nächster Termin ist Mi 09.09.',
    lauf: async (page) => {
      await karte(page, 'Jan Ahrens').scrollIntoViewIfNeeded();
      await pause();
      await karte(page, 'Jan Ahrens').getByRole('button', { name: 'Ersatzlos absagen' }).click();
      await expect(karte(page, 'Jan Ahrens').locator('.status')).toHaveText('✓ abgesagt');
      await pause();
    },
  },
  {
    name: '8 · Toggle 08:05: Sofias frei gewordener Slot erscheint für Cem',
    lauf: async (page) => {
      await page.getByRole('button', { name: '08:05', exact: true }).click();
      await expect(page.getByRole('button', { name: '08:05', exact: true })).toHaveClass(/aktiv/);
      await karte(page, 'Cem Oeztuerk').scrollIntoViewIfNeeded();
      await karte(page, 'Cem Oeztuerk').getByRole('button', { name: 'Anderer Slot' }).click();
      await expect(page.locator('.slot-tag', { hasText: 'Mi 09.09.' }).getByText('09:20 · Sofia Lindqvist')).toBeVisible();
      await pause();
      await karte(page, 'Cem Oeztuerk').getByRole('button', { name: 'schließen' }).click();
    },
  },
  {
    name: '9 · Cem bucht selbst: kein Anruf mehr nötig',
    lauf: async (page) => {
      await karte(page, 'Cem Oeztuerk').scrollIntoViewIfNeeded();
      await karte(page, 'Cem Oeztuerk').getByRole('button', { name: 'Demo: Patient:in bucht selbst' }).click();
      await expect(karte(page, 'Cem Oeztuerk').locator('.status')).toHaveText('✓ selbst gebucht, kein Anruf nötig');
      await pause();
    },
  },
  {
    name: '10 · Krankmeldung verlängern bis Di 08.09.',
    lauf: async (page) => {
      await page.getByRole('button', { name: 'Krankmeldung verlängern' }).click();
      await pause();
      await page.getByRole('button', { name: 'bis Di 08.09.' }).click();
      await expect(page.getByTestId('fall')).not.toHaveCount(14);
      await expect(page.locator('.karte-kopf .tag', { hasText: 'Di 08.09.' }).first()).toBeVisible();
      await pause();
    },
  },
  {
    name: '11 · Notfallliste zum Drucken und zurück',
    lauf: async (page) => {
      await page.getByRole('button', { name: 'Notfallliste' }).click();
      await expect(page.getByRole('heading', { name: /Notfallliste/ })).toBeVisible();
      await pause();
      await page.getByRole('button', { name: 'Zurück zur Oberfläche' }).click();
      await expect(page.getByTestId('fall').first()).toBeVisible();
    },
  },
];

async function neuStarten(page: Page, request: import('@playwright/test').APIRequestContext) {
  expect((await request.post('/api/sim/reset')).ok()).toBeTruthy();
  await page.goto('/');
  await page.waitForSelector('[data-testid=fall]');
}

test.describe('Drehbuch: einzelne Schritte', () => {
  for (const s of schritte) {
    test(s.name, async ({ page, request }) => {
      await neuStarten(page, request);
      await s.lauf(page);
    });
  }
});

test('0 · Komplettdurchlauf: alle Schritte nacheinander', async ({ page, request }) => {
  await neuStarten(page, request);
  for (const s of schritte) await test.step(s.name, () => s.lauf(page));
});
