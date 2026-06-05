// Data access layer for Portfolio + House + Status views.
// Reads live scorecard data from Supabase only — no mock fallback. Returns empty
// results until scorecard_snapshots is populated (e.g. by a scorecard upload),
// so the UI shows clean "no data yet" states instead of fabricated scores.
import { supabase } from './supabase';
import { HOUSES } from './seed';
import { computeHouseRollup, trendArrow } from './scoring';

function periodNum(p: string): number {
  const n = parseInt(String(p).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** The two most recent periods present in scorecard_snapshots (numeric order). */
export async function getPeriods(): Promise<{ current: string | null; previous: string | null }> {
  if (!supabase) return { current: null, previous: null };
  const { data, error } = await supabase.from('scorecard_snapshots').select('period');
  if (error) throw error;
  const periods = [...new Set((data as any[] | null || []).map((r) => r.period as string))].sort(
    (a, b) => periodNum(a) - periodNum(b)
  );
  return {
    current: periods.length ? periods[periods.length - 1] : null,
    previous: periods.length > 1 ? periods[periods.length - 2] : null,
  };
}

// { houseSlug: { kpiId: score } } for a single period, from Supabase.
async function fetchPeriodScoreMaps(period: string | null): Promise<Record<string, Record<string, number>>> {
  if (!supabase || !period) return {};
  const { data, error } = await supabase
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

const hasScores = (m: Record<string, number> | undefined) => Boolean(m && Object.keys(m).length);

export async function getPortfolioData() {
  const { current, previous } = await getPeriods();
  if (!current) return { period: null, previous: null, houses: [] as any[] };

  const [cur, prv] = await Promise.all([fetchPeriodScoreMaps(current), fetchPeriodScoreMaps(previous)]);

  const houses = HOUSES.filter((h) => hasScores(cur[h.slug])).map((h) => {
    const c = computeHouseRollup(cur[h.slug]);
    const p = computeHouseRollup(prv[h.slug] || {});
    const withPrev = hasScores(prv[h.slug]);
    return {
      slug: h.slug,
      name: h.name,
      type: h.type,
      score: c.score,
      color: c.color,
      trend: withPrev ? trendArrow(c.score, p.score) : 'flat',
      categories: c.categories.map((cat) => {
        const pc = p.categories.find((x) => x.key === cat.key);
        return {
          key: cat.key,
          name: cat.name,
          short: cat.short,
          score: cat.score,
          color: cat.color,
          trend: withPrev ? trendArrow(cat.score, pc?.score) : 'flat',
        };
      }),
    };
  });

  return { period: current, previous, houses };
}

export async function getHouseData(slug: string) {
  const house = HOUSES.find((h) => h.slug === slug) || null;
  const { current, previous } = await getPeriods();

  const empty = {
    house,
    period: current,
    prev: previous,
    hasData: false,
    score: 0,
    color: 'gray' as const,
    trend: 'flat' as const,
    categories: [] as any[],
  };
  if (!current) return empty;

  const [cur, prv] = await Promise.all([fetchPeriodScoreMaps(current), fetchPeriodScoreMaps(previous)]);
  const curMap = cur[slug] || {};
  if (!hasScores(curMap)) return empty;

  const c = computeHouseRollup(curMap);
  const p = computeHouseRollup(prv[slug] || {});
  const withPrev = hasScores(prv[slug]);

  const categories = c.categories.map((cat) => {
    const pc = p.categories.find((x) => x.key === cat.key);
    return {
      key: cat.key,
      name: cat.name,
      short: cat.short,
      weight: cat.weight,
      score: cat.score,
      color: cat.color,
      trend: withPrev ? trendArrow(cat.score, pc?.score) : 'flat',
      kpis: cat.kpis.map((k) => {
        const pk = pc?.kpis.find((x) => x.id === k.id);
        return { id: k.id, name: k.name, score: k.score, color: k.color, trend: withPrev ? trendArrow(k.score, pk?.score) : 'flat' };
      }),
    };
  });

  return { house, period: current, prev: previous, hasData: true, score: c.score, color: c.color, trend: withPrev ? trendArrow(c.score, p.score) : 'flat', categories };
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

// Campus Status board: every non-green KPI across all houses (current period),
// split into reds (needs attention) and yellows (watch), each sorted worst-first.
export async function getStatusData() {
  const { current, previous } = await getPeriods();
  if (!current) return { period: null as string | null, reds: [] as StatusItem[], yellows: [] as StatusItem[] };

  const [cur, prv] = await Promise.all([fetchPeriodScoreMaps(current), fetchPeriodScoreMaps(previous)]);
  const reds: StatusItem[] = [];
  const yellows: StatusItem[] = [];

  for (const h of HOUSES) {
    if (!hasScores(cur[h.slug])) continue;
    const c = computeHouseRollup(cur[h.slug]);
    const p = computeHouseRollup(prv[h.slug] || {});
    const withPrev = hasScores(prv[h.slug]);
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
          trend: withPrev ? trendArrow(kpi.score, pk?.score) : 'flat',
        };
        (kpi.color === 'red' ? reds : yellows).push(item);
      }
    }
  }

  reds.sort((a, b) => a.score - b.score);
  yellows.sort((a, b) => a.score - b.score);
  return { period: current, reds, yellows };
}
