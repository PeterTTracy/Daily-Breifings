import { NextResponse } from 'next/server';
import { getSupabase, isSupabaseConfigured } from '../../../lib/supabase';

// Operational KPI scorecard, read from Supabase (source of truth). Reads
// scorecard_snapshots joined with kpi_definitions + houses, then aggregates into
// per-house / per-category / per-KPI structure with 0–3 weighted scores and a
// green/yellow/red rating. Distinct from the .eml financial KPIs — this is the
// operational scorecard maintained directly in Supabase.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rating thresholds on the 0–3 scale (per the scorecard rubric).
const GREEN_MIN = 2.5;
const YELLOW_MIN = 1.5;

function colorFor(score) {
  if (score == null || Number.isNaN(score)) return 'gray';
  if (score >= GREEN_MIN) return 'green';
  if (score >= YELLOW_MIN) return 'yellow';
  return 'red';
}

// kpi_definitions.category is a slug ("nutrition_programming"). Humanize for
// display; keep a canonical order so the six categories render consistently.
const CATEGORY_ORDER = {
  financial_performance: 1,
  quality_assurance: 2,
  customer_satisfaction: 3,
  nutrition_programming: 4,
  employee_relations: 5,
  sustainability: 6,
};

function humanizeCategory(slug) {
  return String(slug || 'uncategorized')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Supabase columns aren't fully known ahead of time, so pull values defensively
// by trying a list of likely field names in priority order.
function pick(obj, keys, fallback = null) {
  if (!obj) return fallback;
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k];
  }
  return fallback;
}

// "P5" / 5 / "5" → { label: 'P5', order: 5 }. Anything unparseable sorts last.
function periodMeta(raw) {
  const s = String(raw ?? '').trim();
  const digits = s.replace(/[^0-9]/g, '');
  const order = digits ? parseInt(digits, 10) : Number.POSITIVE_INFINITY;
  const label = /^p/i.test(s) ? s.toUpperCase() : digits ? `P${digits}` : s || '—';
  return { raw, label, order };
}

// Weighted mean on the 0–3 scale: Σ(score·weight)/Σ(weight). Falls back to a
// plain mean of scores when weights are missing/zero so a house never shows
// blank just because kpi_definitions lacks a weight column.
function aggregate(rows) {
  let sumWeighted = 0;
  let sumWeight = 0;
  let sumScore = 0;
  let count = 0;
  for (const r of rows) {
    if (r.score == null || Number.isNaN(r.score)) continue;
    count += 1;
    sumScore += r.score;
    if (r.weight != null && r.weight > 0) {
      sumWeighted += r.score * r.weight;
      sumWeight += r.weight;
    }
  }
  let score = null;
  if (sumWeight > 0) score = sumWeighted / sumWeight;
  else if (count > 0) score = sumScore / count;
  if (score != null) score = Math.round(score * 100) / 100;
  return { score, color: colorFor(score), count };
}

export async function GET(req) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const supabase = getSupabase();

    // Embed the related rows with `*` so we don't depend on exact column names
    // in kpi_definitions / houses (only scorecard_snapshots' own columns are
    // named explicitly, and those are given by the task).
    const { data, error } = await supabase
      .from('scorecard_snapshots')
      .select('period, house_id, kpi_id, score_0_3, weighted, captured_at, houses(*), kpi_definitions(*)');

    if (error) {
      return NextResponse.json({ configured: true, error: error.message }, { status: 200 });
    }

    const rows = (data || []).filter((r) => r.score_0_3 != null);

    // Normalize each snapshot into a flat shape the aggregator understands.
    const flat = rows.map((r) => {
      const pm = periodMeta(r.period);
      const categorySlug = pick(
        r.kpi_definitions,
        ['category', 'category_name', 'group', 'group_name', 'section'],
        'uncategorized'
      );
      return {
        periodRaw: r.period,
        periodLabel: pm.label,
        periodOrder: pm.order,
        houseId: pick(r.houses, ['id'], r.house_id),
        houseName: pick(r.houses, ['name', 'house_name', 'label', 'title'], String(r.house_id ?? 'House')),
        houseOrder: pick(r.houses, ['sort_order', 'display_order', 'order'], null),
        kpiId: pick(r.kpi_definitions, ['id'], r.kpi_id),
        kpiName: pick(
          r.kpi_definitions,
          ['name', 'label', 'kpi_name', 'title', 'description'],
          String(r.kpi_id ?? 'KPI')
        ),
        category: humanizeCategory(categorySlug),
        categoryOrder: CATEGORY_ORDER[categorySlug] ?? null,
        // weight_pct is the real column (a per-category percentage). Scale is
        // irrelevant to a weighted mean, so use it directly.
        weight: Number(pick(r.kpi_definitions, ['weight_pct', 'weight', 'kpi_weight', 'weighting'], 0)) || 0,
        score: Number(r.score_0_3),
      };
    });

    // A period only counts as "having data" if at least one KPI was actually
    // scored (>0) — an all-zero period (e.g. a not-yet-filled P8) is blank and
    // is excluded from the selector so the default lands on the latest real one.
    const scoredPeriods = new Set(flat.filter((f) => f.score > 0).map((f) => f.periodLabel));
    const periodMap = new Map();
    for (const f of flat) {
      if (!scoredPeriods.has(f.periodLabel)) continue;
      if (!periodMap.has(f.periodLabel)) {
        periodMap.set(f.periodLabel, { label: f.periodLabel, order: f.periodOrder });
      }
    }
    const periods = [...periodMap.values()].sort((a, b) => b.order - a.order).map((p) => p.label);

    if (periods.length === 0) {
      return NextResponse.json({ configured: true, periods: [], period: null, houses: [], overall: null });
    }

    // Chosen period: ?period= (matched by label, case-insensitive) or latest.
    const requested = (new URL(req.url).searchParams.get('period') || '').trim().toUpperCase();
    const period = periods.includes(requested) ? requested : periods[0];

    const forPeriod = flat.filter((f) => f.periodLabel === period);

    // Group: house → category → KPIs.
    const houseMap = new Map();
    for (const f of forPeriod) {
      if (!houseMap.has(f.houseName)) {
        houseMap.set(f.houseName, { id: f.houseId, name: f.houseName, order: f.houseOrder, cats: new Map() });
      }
      const house = houseMap.get(f.houseName);
      if (!house.cats.has(f.category)) {
        house.cats.set(f.category, { name: f.category, order: f.categoryOrder, kpis: [] });
      }
      house.cats.get(f.category).kpis.push(f);
    }

    const houses = [...houseMap.values()]
      .map((h) => {
        const allKpis = [];
        const categories = [...h.cats.values()]
          .map((c) => {
            const agg = aggregate(c.kpis);
            const kpis = c.kpis
              .map((k) => {
                allKpis.push(k);
                return {
                  id: k.kpiId,
                  name: k.kpiName,
                  score: k.score,
                  weight: k.weight,
                  color: colorFor(k.score),
                };
              })
              .sort((a, b) => a.name.localeCompare(b.name));
            return { name: c.name, order: c.order, score: agg.score, color: agg.color, kpis };
          })
          .sort((a, b) => sortByOrderThenName(a, b));
        const agg = aggregate(allKpis);
        return {
          id: h.id,
          name: h.name,
          order: h.order,
          weightedScore: agg.score,
          color: agg.color,
          kpiCount: agg.count,
          categories,
        };
      })
      .sort((a, b) => sortByOrderThenName(a, b));

    // Overall = weighted mean across every scored KPI in the period.
    const overall = aggregate(forPeriod);

    return NextResponse.json({
      configured: true,
      period,
      periods,
      houses,
      overall: { weightedScore: overall.score, color: overall.color, kpiCount: overall.count },
      updatedAt: latestCapturedAt(rows),
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: e.message || 'Failed to load scorecard' }, { status: 200 });
  }
}

function sortByOrderThenName(a, b) {
  const ao = a.order == null ? Number.POSITIVE_INFINITY : Number(a.order);
  const bo = b.order == null ? Number.POSITIVE_INFINITY : Number(b.order);
  if (ao !== bo) return ao - bo;
  return String(a.name).localeCompare(String(b.name));
}

function latestCapturedAt(rows) {
  let latest = null;
  for (const r of rows) {
    if (!r.captured_at) continue;
    if (!latest || r.captured_at > latest) latest = r.captured_at;
  }
  return latest;
}
