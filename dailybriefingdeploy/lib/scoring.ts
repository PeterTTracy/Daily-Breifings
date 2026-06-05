// Scoring engine for the MIT Dining Operations Platform.
// All KPIs are scored 0–3; categories and the portfolio are weighted averages.
import { KPIS, CATEGORIES } from './seed';

export type Color = 'green' | 'yellow' | 'red';
export type Trend = 'up' | 'down' | 'flat';

// Thresholds on the 0–3 scale: Green ≥ 2.5, Yellow 1.5–2.49, Red < 1.5.
export const THRESHOLDS = { green: 2.5, yellow: 1.5 };

export function scoreToColor(score: number): Color {
  if (score >= THRESHOLDS.green) return 'green';
  if (score >= THRESHOLDS.yellow) return 'yellow';
  return 'red';
}

export interface ScoredValue {
  score: number;
  color: Color;
}

/**
 * Weighted average of the KPI scores in a single category.
 * `kpiScores` maps kpiId → 0–3 score; `kpiDefs` supplies the within-category
 * weights. Normalizes by the total weight present, so missing KPIs are ignored.
 */
export function computeCategoryScore(
  kpiScores: Record<string, number>,
  kpiDefs: { id: string; weightWithinCategory: number }[]
): ScoredValue {
  let weighted = 0;
  let total = 0;
  for (const def of kpiDefs) {
    const s = kpiScores[def.id];
    if (s == null) continue;
    const w = def.weightWithinCategory ?? 1;
    weighted += s * w;
    total += w;
  }
  const score = total > 0 ? weighted / total : 0;
  return { score, color: scoreToColor(score) };
}

/**
 * Weighted average across categories → the portfolio (house overall) score.
 * `categoryScores` maps categoryKey → score; `categoryWeights` supplies weights.
 */
export function computePortfolioScore(
  categoryScores: Record<string, number>,
  categoryWeights: { key: string; weight: number }[]
): ScoredValue {
  let weighted = 0;
  let total = 0;
  for (const cat of categoryWeights) {
    const s = categoryScores[cat.key];
    if (s == null) continue;
    weighted += s * cat.weight;
    total += cat.weight;
  }
  const score = total > 0 ? weighted / total : 0;
  return { score, color: scoreToColor(score) };
}

/** Period-over-period direction. `epsilon` avoids flagging tiny changes. */
export function trendArrow(
  current: number,
  previous: number | null | undefined,
  epsilon = 0.05
): Trend {
  if (previous == null) return 'flat';
  const delta = current - previous;
  if (delta > epsilon) return 'up';
  if (delta < -epsilon) return 'down';
  return 'flat';
}

// ---- Convenience rollup used by the Portfolio + House views ----

export interface KpiRollup {
  id: string;
  name: string;
  score: number;
  color: Color;
}

export interface CategoryRollup {
  key: string;
  name: string;
  short: string;
  weight: number;
  score: number;
  color: Color;
  kpis: KpiRollup[];
}

export interface HouseRollup {
  score: number;
  color: Color;
  categories: CategoryRollup[];
}

/** Roll a single house's KPI scores up into category scores and an overall score. */
export function computeHouseRollup(kpiScores: Record<string, number>): HouseRollup {
  const categories: CategoryRollup[] = CATEGORIES.map((cat) => {
    const defs = KPIS.filter((k) => k.category === cat.key);
    const { score, color } = computeCategoryScore(kpiScores, defs);
    return {
      key: cat.key,
      name: cat.name,
      short: cat.short,
      weight: cat.weight,
      score,
      color,
      kpis: defs.map((k) => {
        const s = kpiScores[k.id] ?? 0;
        return { id: k.id, name: k.name, score: s, color: scoreToColor(s) };
      }),
    };
  });

  const categoryScores: Record<string, number> = {};
  for (const c of categories) categoryScores[c.key] = c.score;

  const portfolio = computePortfolioScore(
    categoryScores,
    CATEGORIES.map((c) => ({ key: c.key, weight: c.weight }))
  );

  return { score: portfolio.score, color: portfolio.color, categories };
}
