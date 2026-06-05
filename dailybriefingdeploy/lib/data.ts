// Data access layer for Portfolio / House / Status views.
// Reads the hardcoded scorecard (lib/scorecard-data.ts) so the deployed app
// renders real data without a DB connection. Inactive houses (e.g. McCormick,
// offline) are filtered out everywhere. The "current" period is the latest one
// that actually has scores (so a blank P8 template doesn't override real P7).
import { HOUSES } from './seed';
import { computeHouseRollup, trendArrow } from './scoring';
import { SCORECARD } from './scorecard-data';

export const ACTIVE_HOUSES = HOUSES.filter((h) => h.active !== false);
const isActive = (slug: string) => ACTIVE_HOUSES.some((h) => h.slug === slug);

const periodNum = (p: string) => {
  const n = parseInt(String(p).replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

const hasRealScores = (period: string) =>
  Object.values(SCORECARD[period] || {}).some((m) => Object.values(m).some((v) => v > 0));

/** Latest two periods that have real (non-zero) scores. */
export function getPeriods(): { current: string | null; previous: string | null } {
  const all = Object.keys(SCORECARD).sort((a, b) => periodNum(a) - periodNum(b));
  const withData = all.filter(hasRealScores);
  const ordered = withData.length ? withData : all; // fall back to any period if none filled
  return {
    current: ordered.length ? ordered[ordered.length - 1] : null,
    previous: ordered.length > 1 ? ordered[ordered.length - 2] : null,
  };
}

const scoreMap = (period: string | null, slug: string): Record<string, number> =>
  (period && SCORECARD[period]?.[slug]) || {};
const hasScores = (m: Record<string, number>) => Object.keys(m).length > 0;

export function getPortfolioData() {
  const { current, previous } = getPeriods();
  if (!current) return { period: null, previous: null, houses: [] as any[] };

  const houses = ACTIVE_HOUSES.filter((h) => hasScores(scoreMap(current, h.slug))).map((h) => {
    const c = computeHouseRollup(scoreMap(current, h.slug));
    const prevMap = scoreMap(previous, h.slug);
    const p = computeHouseRollup(prevMap);
    const withPrev = hasScores(prevMap);
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

export function getHouseData(slug: string) {
  const houseAny = HOUSES.find((h) => h.slug === slug) || null;
  const inactive = Boolean(houseAny && !isActive(slug));
  const house = houseAny && isActive(slug) ? houseAny : null;

  const { current, previous } = getPeriods();
  const empty = {
    house,
    inactive,
    period: current,
    prev: previous,
    hasData: false,
    score: 0,
    color: 'gray' as const,
    trend: 'flat' as const,
    categories: [] as any[],
  };
  if (!house || !current) return empty;

  const curMap = scoreMap(current, slug);
  if (!hasScores(curMap)) return empty;

  const c = computeHouseRollup(curMap);
  const prevMap = scoreMap(previous, slug);
  const p = computeHouseRollup(prevMap);
  const withPrev = hasScores(prevMap);

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

  return { house, inactive: false, period: current, prev: previous, hasData: true, score: c.score, color: c.color, trend: withPrev ? trendArrow(c.score, p.score) : 'flat', categories };
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

export function getStatusData() {
  const { current, previous } = getPeriods();
  if (!current) return { period: null as string | null, reds: [] as StatusItem[], yellows: [] as StatusItem[] };

  const reds: StatusItem[] = [];
  const yellows: StatusItem[] = [];

  for (const h of ACTIVE_HOUSES) {
    const curMap = scoreMap(current, h.slug);
    if (!hasScores(curMap)) continue;
    const c = computeHouseRollup(curMap);
    const prevMap = scoreMap(previous, h.slug);
    const p = computeHouseRollup(prevMap);
    const withPrev = hasScores(prevMap);
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
