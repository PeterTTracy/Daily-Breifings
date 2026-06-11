// Operational Checklist Audits — Apr–May 2026 (33 audits by Pete & Eric).
// 12 categories scored 1–5 where 1 = best, 5 = worst (INVERTED vs the scorecard).
// Total = sum of the 12 (range 12–60).
export const CHECKLIST_CATEGORIES = [
  'Facility & Sanitation',
  'Food Safety & Compliance',
  'Production Readiness',
  'Labor Deployment',
  'Food Quality',
  'Guest Experience',
  'Food Safety Execution',
  'Labor Efficiency',
  'Food Safety & Storage',
  'Cleaning & Sanitation',
  'Inventory & Cost Control',
  'Labor & Closeout',
];

export type AuditRating = 'Exceptional' | 'Strong' | 'Stable' | 'At Risk' | 'Critical';

export interface ChecklistHouse {
  slug: string;
  audits: number;
  avgTotal: number;
  rating: AuditRating;
  scores: number[]; // 12 category averages, 1=best 5=worst (same order as CHECKLIST_CATEGORIES)
}

// McCormick skipped (deactivated).
export const CHECKLIST: Record<string, ChecklistHouse> = {
  baker: { slug: 'baker', audits: 5, avgTotal: 30.6, rating: 'Stable', scores: [2.2, 2.6, 2.6, 2.2, 2.4, 2.2, 2.8, 2.4, 3.2, 2.6, 3.0, 2.4] },
  maseeh: { slug: 'maseeh', audits: 14, avgTotal: 35.2, rating: 'At Risk', scores: [2.9, 2.9, 3.1, 2.7, 2.9, 2.4, 3.3, 2.7, 3.6, 3.0, 2.9, 2.7] },
  'new-vassar': { slug: 'new-vassar', audits: 3, avgTotal: 28.0, rating: 'Stable', scores: [2.0, 2.7, 1.7, 2.0, 2.0, 2.3, 2.3, 2.0, 4.0, 2.0, 2.7, 2.3] },
  next: { slug: 'next', audits: 2, avgTotal: 29.5, rating: 'Stable', scores: [2.0, 2.5, 2.0, 1.5, 1.5, 1.5, 3.5, 2.5, 4.5, 3.0, 3.0, 2.0] },
  retail: { slug: 'retail', audits: 4, avgTotal: 20.0, rating: 'Strong', scores: [1.5, 3.2, 1.0, 1.0, 1.8, 1.5, 1.5, 1.0, 3.0, 1.8, 1.8, 1.0] },
  simmons: { slug: 'simmons', audits: 3, avgTotal: 24.7, rating: 'Stable', scores: [2.0, 2.0, 1.3, 2.0, 1.7, 1.3, 2.3, 1.3, 3.7, 2.7, 2.0, 2.3] },
};

export function getChecklist(slug: string): ChecklistHouse | null {
  return CHECKLIST[slug] || null;
}

/** Status color for the overall audit rating. */
export function ratingColor(rating: AuditRating): 'green' | 'yellow' | 'red' {
  if (rating === 'Exceptional' || rating === 'Strong') return 'green';
  if (rating === 'Stable') return 'yellow';
  return 'red'; // At Risk / Critical
}

/** Invert a 1–5 audit score (1=best) onto the 0–3 scorecard scale (higher=better). */
export const invertTo03 = (raw: number) => ((6 - raw) / 5) * 3;
