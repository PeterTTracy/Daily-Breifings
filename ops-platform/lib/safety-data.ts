// 2026 Safety Tracker — "Safety Inspection" sheet (684 rows).
// Per-house finding counts + named open HIGH-priority items. This is the real
// evidence layer behind the Quality Assurance KPIs (Sanitation, Hygiene/PPE,
// Logs). It is displayed via the Safety Findings card and Campus Status; it does
// NOT recompute the scorecard KPI scores (those stay as the verified P7 values).
//
// Retail child cafés (Forbes / Bosworth's / Dean's Beans) are stored individually
// and rolled up into the `retail` cluster on demand. McCormick is kept here but
// excluded from active/campus views (deactivated, like everywhere else).

export interface SafetyHouse {
  slug: string;
  total: number;
  open: number;
  completed: number;
  high: number;
  med: number;
  low: number;
}

const INACTIVE = new Set(['mccormick']);
const RETAIL_CHILDREN = ['forbes', 'bosworths', 'deans-beans'];

// Raw per-unit counts from the aggregated Safety Inspection tab.
const RAW: SafetyHouse[] = [
  { slug: 'baker', total: 52, open: 37, completed: 15, high: 4, med: 2, low: 0 },
  { slug: 'maseeh', total: 118, open: 83, completed: 35, high: 32, med: 3, low: 0 },
  { slug: 'mccormick', total: 58, open: 41, completed: 17, high: 14, med: 5, low: 0 },
  { slug: 'next', total: 63, open: 22, completed: 41, high: 19, med: 6, low: 0 },
  { slug: 'simmons', total: 63, open: 47, completed: 16, high: 14, med: 3, low: 0 },
  { slug: 'new-vassar', total: 74, open: 57, completed: 17, high: 15, med: 2, low: 0 },
  // Retail child cafés
  { slug: 'forbes', total: 69, open: 51, completed: 18, high: 17, med: 0, low: 1 },
  { slug: 'bosworths', total: 3, open: 1, completed: 2, high: 2, med: 0, low: 0 },
  { slug: 'deans-beans', total: 2, open: 1, completed: 1, high: 1, med: 0, low: 0 },
];

const BY_SLUG: Record<string, SafetyHouse> = Object.fromEntries(RAW.map((h) => [h.slug, h]));

function sum(rows: SafetyHouse[], slug: string): SafetyHouse {
  return rows.reduce(
    (acc, h) => ({
      slug,
      total: acc.total + h.total,
      open: acc.open + h.open,
      completed: acc.completed + h.completed,
      high: acc.high + h.high,
      med: acc.med + h.med,
      low: acc.low + h.low,
    }),
    { slug, total: 0, open: 0, completed: 0, high: 0, med: 0, low: 0 },
  );
}

/** Safety summary for a house. The `retail` cluster rolls up its child cafés. */
export function getSafety(slug: string): SafetyHouse | null {
  if (slug === 'retail') return sum(RETAIL_CHILDREN.map((s) => BY_SLUG[s]).filter(Boolean), 'retail');
  return BY_SLUG[slug] || null;
}

/** Resolution rate 0–1 (completed ÷ total). */
export const completionRate = (h: SafetyHouse) => (h.total ? h.completed / h.total : 0);

// Minimum finding count for a house to qualify for best/worst (the 2–3 finding
// cafés are too noisy to spotlight a resolution rate from).
const MIN_SAMPLE = 10;

/** Campus roll-up across all active units (excludes McCormick; retail children counted once). */
export function getCampusSafety() {
  const active = RAW.filter((h) => !INACTIVE.has(h.slug));
  const totals = sum(active, 'campus');
  const rates = active
    .filter((h) => h.total >= MIN_SAMPLE)
    .map((h) => ({ slug: h.slug, rate: completionRate(h) }))
    .sort((a, b) => a.rate - b.rate);
  return {
    ...totals,
    rate: completionRate(totals),
    worst: rates[0] || null,
    best: rates[rates.length - 1] || null,
  };
}

// Campus-wide top areas of concern (the per-unit area split lives in the
// "Location - Consolidated" sheet — not yet ingested).
export const SAFETY_TOP_AREAS = [
  { area: 'Sanitation — Floors / Walls / Equipment / Ceilings', count: 186 },
  { area: 'Food Safety — Storage', count: 72 },
  { area: 'Facilities — General', count: 33 },
  { area: 'Employee Safety', count: 25 },
  { area: 'Food Safety — Labeling', count: 21 },
];

export interface SafetyIssue {
  id: string;
  house: string;
  houseName: string;
  area: string;
  title: string;
  severity: 'high';
  facts: string;
  impact: string;
  action: string;
  owner: string;
  target: string;
  status: 'open';
}

// Open HIGH-priority findings with full observation/required-action detail.
// (Houses also carry many more HIGH findings as counts only — see getSafety().)
export const SAFETY_ISSUES: SafetyIssue[] = [
  {
    id: 'safety-mccormick-eyewash',
    house: 'mccormick',
    houseName: 'McCormick',
    area: 'Employee Safety',
    title: 'Eye wash station unusable',
    severity: 'high',
    facts: 'Eye wash station found unusable during safety inspection (Feb 2026).',
    impact: 'No functioning emergency eye wash — chemical-exposure response gap and employee-safety/compliance risk.',
    action: 'Repair or replace the eye wash station; verify weekly flushing once restored.',
    owner: 'Operations and Culinary Team',
    target: 'Feb 2026',
    status: 'open',
  },
  {
    id: 'safety-next-paint',
    house: 'next',
    houseName: 'Next',
    area: 'Facilities — General',
    title: 'Peeling paint on kitchen poles (FOB risk)',
    severity: 'high',
    facts: 'Peeling paint observed on kitchen support poles (Feb 2026).',
    impact: 'Paint chips can fall into food below — foreign-object (FOB) contamination risk.',
    action: 'Scrape and repaint affected poles; isolate the area until resolved.',
    owner: 'Operations and Culinary Team',
    target: 'Feb 2026',
    status: 'open',
  },
  {
    id: 'safety-baker-melamine',
    house: 'baker',
    houseName: 'Baker',
    area: 'Sanitation — Equipment',
    title: 'Chipping paint on melamine serviceware',
    severity: 'high',
    facts: 'Chipping / peeling finish on melamine serviceware (Apr 2026).',
    impact: 'Damaged serviceware can shed material into food — foreign-object (FOB) contamination risk.',
    action: 'Pull damaged melamine serviceware from rotation and replace.',
    owner: 'Operations and Culinary Team',
    target: 'Apr 2026',
    status: 'open',
  },
];

/** Named safety issues for a house (empty for most — detail exists only for flagged items). */
export function getHouseSafetyIssues(slug: string): SafetyIssue[] {
  return SAFETY_ISSUES.filter((i) => i.house === slug);
}

/** Active named safety issues for Campus Status (excludes deactivated houses). */
export function getActiveSafetyIssues(): SafetyIssue[] {
  return SAFETY_ISSUES.filter((i) => !INACTIVE.has(i.house));
}

export function getSafetyIssue(id: string): SafetyIssue | null {
  return SAFETY_ISSUES.find((i) => i.id === id) || null;
}
