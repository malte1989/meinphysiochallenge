export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://ausfall:ausfall@localhost:5433/ausfall',
  now: process.env.NOW ?? '2026-09-07T05:40:00Z',
  dataDir: process.env.DATA_DIR ?? new URL('../../data', import.meta.url).pathname,
  absageTage: Number(process.env.ABSAGE_TAGE ?? 2),
  exportFensterBis: '2026-09-13',
};
