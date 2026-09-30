import type { Heilmittel } from './types.js';

const MAPPING: Record<string, Heilmittel> = {
  'Krankengymnastik': 'KG',
  'Manuelle Therapie': 'MT',
  'Lymphdrainage 45 Min.': 'MLD45',
  'Geraetegestuetzte Krankengymnastik': 'KGG',
};

export function serviceToHeilmittel(service: string): Heilmittel {
  const h = MAPPING[service];
  if (!h) throw new Error(`Unbekannte Leistung: ${service}`);
  return h;
}
