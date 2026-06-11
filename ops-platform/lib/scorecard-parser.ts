// Parser for MIT FY operational scorecard workbooks (SheetJS).
// Reads the "Site Comparison" sheet and returns one score per (house, KPI).
//
// IMPORTANT: KPIs are matched by NAME (column B), not by row position — the
// workbook orders KPIs by the Category Summary order (Nutrition, Sustainability,
// Financial, Quality, Customer Satisfaction, Employee Relations), which differs
// from seed.ts. Blank score cells are treated as 0 (an unfilled scorecard reads
// as all-red). Retail is not present in this sheet and is simply absent.
import * as XLSX from 'xlsx';
import { KPIS } from './seed';

// "Site Comparison" house SCORE columns (0-based). The column to the right of
// each is the weighted score, which we ignore (we recompute weights ourselves).
export const HOUSE_COLUMNS: Record<string, number> = {
  maseeh: 3, // D
  mccormick: 5, // F
  baker: 7, // H
  next: 9, // J
  simmons: 11, // L
  'new-vassar': 13, // N
};

export interface ParsedScore {
  houseSlug: string;
  kpiId: string;
  score: number;
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

// Canonical KPI name → id, sourced from seed.ts so the two never drift apart.
const NAME_TO_ID: Record<string, string> = Object.fromEntries(KPIS.map((k) => [norm(k.name), k.id]));

/** Parse a scorecard workbook buffer into (house, KPI, score) rows. */
export function parseScorecard(data: Buffer | Uint8Array): ParsedScore[] {
  const wb = XLSX.read(data, { type: 'buffer' });
  const sheet = wb.Sheets['Site Comparison'];
  if (!sheet) throw new Error('Workbook is missing a "Site Comparison" sheet');

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  const out: ParsedScore[] = [];

  for (const row of rows) {
    const kpiId = NAME_TO_ID[norm(row[1])]; // column B = KPI name
    if (!kpiId) continue; // skip the header row, TOTAL/PERFECT rows, and anything unrecognized
    for (const [houseSlug, col] of Object.entries(HOUSE_COLUMNS)) {
      const raw = row[col];
      const n = raw === '' || raw == null ? 0 : Number(raw);
      out.push({ houseSlug, kpiId, score: Number.isFinite(n) ? n : 0 });
    }
  }
  return out;
}
