// Risk scorecard — a risk-weighted cut of the 2026 Safety Tracker, pre-calculated
// offline and ranked by an overall risk score (HIGH-weighted open findings ÷
// closure rate). This is the leadership-facing "where do I look first" view; it
// is distinct from the raw finding counts in lib/safety-data.ts (which logs every
// finding). Numbers here are the verified risk roll-up, not recomputed in-app.
//
// Forbes is the retail unit with risk data; the `retail` cluster maps to it.
// McCormick is deactivated and intentionally absent.

export type RAG = 'red' | 'yellow' | 'green';

export interface UnitRisk {
  slug: string;
  name: string;
  rag: RAG;
  total: number; // total findings in the risk-weighted set
  high: number; // HIGH-priority findings
  open: number; // still open
  closurePct: number; // 0–100, share closed
  riskScore: number; // composite risk (higher = more urgent)
}

// Ranked most → least risk. Drives the Portfolio risk strip and the Campus
// Status risk ranking.
export const UNIT_RISK: UnitRisk[] = [
  { slug: 'maseeh', name: 'Maseeh', rag: 'red', total: 73, high: 32, open: 38, closurePct: 48, riskScore: 179 },
  { slug: 'new-vassar', name: 'New Vassar', rag: 'red', total: 57, high: 15, open: 40, closurePct: 30, riskScore: 130 },
  { slug: 'next', name: 'Next', rag: 'red', total: 46, high: 19, open: 23, closurePct: 50, riskScore: 112 },
  { slug: 'forbes', name: 'Forbes', rag: 'red', total: 47, high: 17, open: 17, closurePct: 64, riskScore: 111 },
  { slug: 'simmons', name: 'Simmons', rag: 'red', total: 45, high: 14, open: 28, closurePct: 38, riskScore: 104 },
  { slug: 'baker', name: 'Baker', rag: 'red', total: 34, high: 4, open: 22, closurePct: 35, riskScore: 72.5 },
];

// Retail cluster has no standalone risk row — it maps to Forbes, its café with data.
const RISK_SLUG_ALIAS: Record<string, string> = { retail: 'forbes' };

const BY_SLUG: Record<string, UnitRisk> = Object.fromEntries(UNIT_RISK.map((u) => [u.slug, u]));

/** Risk row for a house (retail → Forbes). Null when no risk data exists. */
export function getUnitRisk(slug: string): UnitRisk | null {
  return BY_SLUG[RISK_SLUG_ALIAS[slug] || slug] || null;
}

export interface RiskCategory {
  name: string;
  total: number;
  open: number;
  risk: number;
}

// Campus-wide finding split by category, ranked by risk contribution.
export const RISK_CATEGORIES: RiskCategory[] = [
  { name: 'Sanitization', total: 126, open: 86, risk: 274 },
  { name: 'Food Storage', total: 110, open: 50, risk: 265 },
  { name: 'Employee Hygiene', total: 40, open: 27, risk: 91 },
  { name: 'Temp Logs', total: 20, open: 8, risk: 55.5 },
  { name: 'Equipment', total: 20, open: 8, risk: 52 },
  { name: 'Documentation', total: 11, open: 4, risk: 27 },
  { name: 'Food Prep', total: 9, open: 6, risk: 20 },
];

export interface RiskFactor {
  unit: string;
  category: string;
  score: number;
}

// The single highest-risk unit×category cells across campus.
export const TOP_RISK_FACTORS: RiskFactor[] = [
  { unit: 'Maseeh', category: 'Food Storage', score: 51 },
  { unit: 'Next', category: 'Sanitization', score: 51 },
  { unit: 'Maseeh', category: 'Sanitization', score: 49 },
  { unit: 'New Vassar', category: 'Food Storage', score: 49 },
  { unit: 'Forbes', category: 'Food Storage', score: 45 },
];

/** Campus roll-up across all ranked units. */
export function getCampusRisk() {
  const totals = UNIT_RISK.reduce(
    (a, u) => ({
      total: a.total + u.total,
      high: a.high + u.high,
      open: a.open + u.open,
      riskScore: a.riskScore + u.riskScore,
    }),
    { total: 0, high: 0, open: 0, riskScore: 0 },
  );
  const closurePct = totals.total ? Math.round(((totals.total - totals.open) / totals.total) * 100) : 0;
  return { ...totals, closurePct, units: UNIT_RISK.length };
}
