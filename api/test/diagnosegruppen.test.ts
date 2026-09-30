import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8'));

describe('diagnosegruppen.json', () => {
  const gruppen: any[] = read('diagnosegruppen.json');
  const verwendet = [...new Set<string>(read('verordnungen.json').map((v: any) => v.diagnosegruppe))].sort();

  test('enthält jede Diagnosegruppe, die in den Verordnungen vorkommt', () => {
    expect(gruppen.map((g) => g.code).sort()).toEqual(verwendet);
  });
  test('jeder Eintrag nennt Quelle und Verifikationsstatus, nichts ist ohne Beleg', () => {
    for (const g of gruppen) {
      expect(g.kurz).toBeTruthy();
      expect(g.bezeichnung).toBeTruthy();
      expect(g.quellen.length).toBeGreaterThan(0);
      expect(g.quellen.every((q: string) => q.startsWith('https://'))).toBe(true);
      expect(['gruppe_sekundaer_belegt']).toContain(g.verifikation.gruppe);
      expect(g.verifikation.ziffer).toMatch(/^(nicht_primaer_geprueft|nicht_belegt)$/);
    }
  });
});
