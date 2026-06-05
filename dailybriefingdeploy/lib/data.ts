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
