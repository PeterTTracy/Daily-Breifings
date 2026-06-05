// Deterministic mock scorecard data for Phase 1 demo (no Supabase / xlsx yet).
// Produces P7 and P8 scores (0–3) for all 7 houses across all 20 KPIs, with
// house "personalities" so the Portfolio and House views show varied R/Y/G and
// real period-over-period trends. Deterministic (no randomness) so SSR is stable.
import { HOUSES, KPIS } from './seed';
import { computeHouseRollup, trendArrow, Color, Trend } from './scoring';

export const PERIODS = ['P7', 'P8'] as const;
export type Period = (typeof PERIODS)[number];
export const CURRENT_PERIOD: Period = 'P8';
export const PREVIOUS_PERIOD: Period = 'P7';

const clamp = (n: number) => Math.max(0, Math.min(3, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

// Baseline P7 level per house (overall tendency).
const HOUSE_BASE: Record<string, number> = {
  maseeh: 2.7,
  baker: 2.55,
  mccormick: 2.35,
  next: 2.05,
  simmons: 2.3,
  'new-vassar': 1.85,
  retail: 2.5,
};

// Per-category tilt so categories differ within a house.
const CAT_TILT: Record<string, number> = {
  nutrition_programming: 0.1,
  financial_performance: -0.1,
  quality_assurance: 0.15,
  employee_relations: -0.05,
  customer_satisfaction: 0.05,
  sustainability: -0.2,
};

// Per-house P7 → P8 drift (some improving, some sliding).
const HOUSE_TREND: Record<string, number> = {
  maseeh: 0.05,
  baker: -0.1,
  mccormick: 0.15,
  next: 0.1,
  simmons: -0.05,
  'new-vassar': 0.2,
  retail: 0.0,
};

// Deterministic per-KPI wobble by index → spread within a category.
const kpiWobble = (index: number) => ((index % 5) - 2) * 0.13; // -0.26 .. +0.26

// Explicit standout cells to create clear reds and interesting stories.
// period → house slug → kpiId → score.
const OVERRIDES: Record<string, Record<string, Record<string, number>>> = {
  P7: {
    'new-vassar': { sanitation_cleanliness: 1.1, logs_completion: 1.2, overtime_control: 1.3 },
    next: { overtime_control: 1.3, inventory_accuracy: 1.4 },
    simmons: { engagement_retention: 1.4 },
    mccormick: { climate_change: 1.3 },
  },
  P8: {
    'new-vassar': { sanitation_cleanliness: 1.4, logs_completion: 1.6, overtime_control: 1.5 }, // recovering
    next: { overtime_control: 1.6, inventory_accuracy: 1.5 },
    simmons: { engagement_retention: 1.2 }, // worsening
    baker: { food_cost_vs_budget: 1.4 }, // new red
  },
};

function generatedScore(slug: string, categoryKey: string, kpiIndex: number, period: Period): number {
  const base = HOUSE_BASE[slug] ?? 2.2;
  const tilt = CAT_TILT[categoryKey] ?? 0;
  const wobble = kpiWobble(kpiIndex);
  const drift = period === 'P8' ? HOUSE_TREND[slug] ?? 0 : 0;
  return clamp(base + tilt + wobble + drift);
}

function buildPeriod(period: Period): Record<string, Record<string, number>> {
  const houses: Record<string, Record<string, number>> = {};
  for (const h of HOUSES) {
    const scores: Record<string, number> = {};
    KPIS.forEach((kpi, i) => {
      const override = OVERRIDES[period]?.[h.slug]?.[kpi.id];
      scores[kpi.id] = round1(override != null ? override : generatedScore(h.slug, kpi.category, i, period));
    });
    houses[h.slug] = scores;
  }
  return houses;
}

export const MOCK_SCORES: Record<string, Record<string, Record<string, number>>> = {
  P7: buildPeriod('P7'),
  P8: buildPeriod('P8'),
};

/** Raw kpiId → score map for one house in one period. */
export function getScoreMap(slug: string, period: Period = CURRENT_PERIOD): Record<string, number> {
  return MOCK_SCORES[period]?.[slug] ?? {};
}

// ---- View selectors (swap these for Supabase queries in a later phase) ----

export interface PortfolioCategoryCell {
  key: string;
  name: string;
  short: string;
  score: number;
  color: Color;
  trend: Trend;
}

export interface PortfolioHouse {
  slug: string;
  name: string;
  type: string;
  score: number;
  color: Color;
  trend: Trend;
  categories: PortfolioCategoryCell[];
}

export function getPortfolioView(
  period: Period = CURRENT_PERIOD,
  prev: Period = PREVIOUS_PERIOD
): PortfolioHouse[] {
  return HOUSES.map((h) => {
    const cur = computeHouseRollup(getScoreMap(h.slug, period));
    const prv = computeHouseRollup(getScoreMap(h.slug, prev));
    return {
      slug: h.slug,
      name: h.name,
      type: h.type,
      score: cur.score,
      color: cur.color,
      trend: trendArrow(cur.score, prv.score),
      categories: cur.categories.map((c) => {
        const pc = prv.categories.find((x) => x.key === c.key);
        return {
          key: c.key,
          name: c.name,
          short: c.short,
          score: c.score,
          color: c.color,
          trend: trendArrow(c.score, pc?.score),
        };
      }),
    };
  });
}

export function getHouseView(
  slug: string,
  period: Period = CURRENT_PERIOD,
  prev: Period = PREVIOUS_PERIOD
) {
  const house = HOUSES.find((h) => h.slug === slug) || null;
  const cur = computeHouseRollup(getScoreMap(slug, period));
  const prv = computeHouseRollup(getScoreMap(slug, prev));

  const categories = cur.categories.map((c) => {
    const pc = prv.categories.find((x) => x.key === c.key);
    return {
      key: c.key,
      name: c.name,
      short: c.short,
      weight: c.weight,
      score: c.score,
      color: c.color,
      trend: trendArrow(c.score, pc?.score),
      kpis: c.kpis.map((k) => {
        const pk = pc?.kpis.find((x) => x.id === k.id);
        return { id: k.id, name: k.name, score: k.score, color: k.color, trend: trendArrow(k.score, pk?.score) };
      }),
    };
  });

  return {
    house,
    period,
    prev,
    score: cur.score,
    color: cur.color,
    trend: trendArrow(cur.score, prv.score),
    categories,
  };
}
