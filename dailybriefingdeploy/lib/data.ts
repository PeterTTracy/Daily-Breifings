// Data access layer for Portfolio + House views.
// Reads live scorecard data from Supabase when configured; otherwise falls back
// to the deterministic mock data so local/preview/builds keep working.
import { supabase } from './supabase';
import { HOUSES } from './seed';
import { computeHouseRollup, trendArrow } from './scoring';
import {
  CURRENT_PERIOD,
  PREVIOUS_PERIOD,
  Period,
  getScoreMap as mockGetScoreMap,
  getPortfolioView as mockPortfolioView,
  getHouseView as mockHouseView,
} from './mock-scores';

export { CURRENT_PERIOD, PREVIOUS_PERIOD };

// { houseSlug: { kpiId: score } } for a single period, from Supabase.
async function fetchPeriodScoreMaps(period: Period): Promise<Record<string, Record<string, number>>> {
  const { data, error } = await supabase!
    .from('scorecard_snapshots')
    .select('score_0_3, kpi_id, houses(slug)')
    .eq('period', period);
  if (error) throw error;

  const maps: Record<string, Record<string, number>> = {};
  for (const row of (data as any[]) || []) {
    const slug = row.houses?.slug;
    if (!slug) continue;
    (maps[slug] ||= {})[row.kpi_id] = Number(row.score_0_3);
  }
  return maps;
}

export async function getPortfolioData(period: Period = CURRENT_PERIOD, prev: Period = PREVIOUS_PERIOD) {
  if (!supabase) return mockPortfolioView(period, prev);

  const [cur, prv] = await Promise.all([fetchPeriodScoreMaps(period), fetchPeriodScoreMaps(prev)]);

  return HOUSES.map((h) => {
    const c = computeHouseRollup(cur[h.slug] || {});
    const p = computeHouseRollup(prv[h.slug] || {});
    return {
      slug: h.slug,
      name: h.name,
      type: h.type,
      score: c.score,
      color: c.color,
      trend: trendArrow(c.score, p.score),
      categories: c.categories.map((cat) => {
        const pc = p.categories.find((x) => x.key === cat.key);
        return {
          key: cat.key,
          name: cat.name,
          short: cat.short,
          score: cat.score,
          color: cat.color,
          trend: trendArrow(cat.score, pc?.score),
        };
      }),
    };
  });
}

export async function getHouseData(slug: string, period: Period = CURRENT_PERIOD, prev: Period = PREVIOUS_PERIOD) {
  if (!supabase) return mockHouseView(slug, period, prev);

  const house = HOUSES.find((h) => h.slug === slug) || null;
  const [cur, prv] = await Promise.all([fetchPeriodScoreMaps(period), fetchPeriodScoreMaps(prev)]);
  const c = computeHouseRollup(cur[slug] || {});
  const p = computeHouseRollup(prv[slug] || {});

  const categories = c.categories.map((cat) => {
    const pc = p.categories.find((x) => x.key === cat.key);
    return {
      key: cat.key,
      name: cat.name,
      short: cat.short,
      weight: cat.weight,
      score: cat.score,
      color: cat.color,
      trend: trendArrow(cat.score, pc?.score),
      kpis: cat.kpis.map((k) => {
        const pk = pc?.kpis.find((x) => x.id === k.id);
        return { id: k.id, name: k.name, score: k.score, color: k.color, trend: trendArrow(k.score, pk?.score) };
      }),
    };
  });

  return {
    house,
    period,
    prev,
    score: c.score,
    color: c.color,
    trend: trendArrow(c.score, p.score),
    categories,
  };
}

// Score maps for one period from Supabase, or the mock fallback when unconfigured.
async function periodScoreMaps(period: Period): Promise<Record<string, Record<string, number>>> {
  if (!supabase) {
    const maps: Record<string, Record<string, number>> = {};
    for (const h of HOUSES) maps[h.slug] = mockGetScoreMap(h.slug, period);
    return maps;
  }
  return fetchPeriodScoreMaps(period);
}

export interface StatusItem {
  houseSlug: string;
  houseName: string;
  category: string;
  kpi: string;
  score: number;
  color: 'red' | 'yellow';
  trend: 'up' | 'down' | 'flat';
}

// Campus Status board data: every non-green KPI across all houses, split into
// reds (needs attention) and yellows (watch), each sorted worst-first.
export async function getStatusData(period: Period = CURRENT_PERIOD, prev: Period = PREVIOUS_PERIOD) {
  const [cur, prv] = await Promise.all([periodScoreMaps(period), periodScoreMaps(prev)]);
  const reds: StatusItem[] = [];
  const yellows: StatusItem[] = [];

  for (const h of HOUSES) {
    const c = computeHouseRollup(cur[h.slug] || {});
    const p = computeHouseRollup(prv[h.slug] || {});
    for (const cat of c.categories) {
      const pc = p.categories.find((x) => x.key === cat.key);
      for (const kpi of cat.kpis) {
        if (kpi.color === 'green') continue;
        const pk = pc?.kpis.find((x) => x.id === kpi.id);
        const item: StatusItem = {
          houseSlug: h.slug,
          houseName: h.name,
          category: cat.name,
          kpi: kpi.name,
          score: kpi.score,
          color: kpi.color as 'red' | 'yellow',
          trend: trendArrow(kpi.score, pk?.score),
        };
        (kpi.color === 'red' ? reds : yellows).push(item);
      }
    }
  }

  reds.sort((a, b) => a.score - b.score);
  yellows.sort((a, b) => a.score - b.score);
  return { period, reds, yellows };
}
