// Hardcoded scorecard data so the app renders real scores WITHOUT a database
// connection (the Supabase env vars aren't set on Vercel). P7 = real filled
// scores (May 2026); P8 = blank template (all zeros) awaiting fill-in.
//
// The scoring engine (lib/scoring.ts) computes the rollups from these — e.g.
// Maseeh's weighted total comes out to 1.349 (RED), matching the source file.

// Houses present in the scorecard, in the workbook's column order.
const HOUSE_ORDER = ['maseeh', 'mccormick', 'baker', 'next', 'simmons', 'new-vassar'] as const;

// P7 scores by KPI id → [maseeh, mccormick, baker, next, simmons, new-vassar] (0–3).
const P7_BY_KPI: Record<string, number[]> = {
  // Nutrition / Programming
  menu_compliance: [1, 1, 1.5, 2, 2.5, 2],
  special_diet_allergen: [2, 2.5, 2, 2.5, 2.75, 2.5],
  // Sustainability
  waste_diversion_recycling: [2, 1.5, 1.5, 2.5, 3, 2.5],
  local_sustainable_sourcing: [1, 1, 1, 1, 1, 1],
  climate_change: [1.5, 2.5, 1.5, 2.75, 3, 2.8],
  // Financial Performance
  food_cost_vs_budget: [2, 3, 1, 1, 3, 3],
  labor_cost_vs_budget: [3, 1.5, 1, 2, 1.5, 3],
  cost_per_meal: [1.5, 1.5, 1, 3, 1.5, 1],
  overtime_control: [1, 1, 1, 1, 1.5, 1],
  inventory_accuracy: [2.5, 1.5, 2, 2, 1.5, 1],
  // Quality Assurance
  sanitation_cleanliness: [0, 1, 1, 2, 1, 1],
  hygiene_compliance: [1, 2, 2, 2, 2, 1],
  ppe_compliance: [1, 2, 2, 2, 2, 1],
  logs_completion: [1, 2, 2, 3, 2, 2],
  pic_required_trainings: [1, 2, 3, 3, 2, 2],
  // Customer Satisfaction
  guest_satisfaction_survey: [0, 2, 2, 1, 2, 3],
  service_recovery_complaints: [0, 2, 2, 2, 2, 3],
  // Employee Relations
  attendance_reliability: [1.4, 1.2, 2.1, 2.6, 1.3, 1],
  training_development: [2, 2, 2, 2, 2, 2],
  engagement_retention: [2, 3, 2.5, 2.5, 1, 2.5],
};

function buildPeriod(byKpi: Record<string, number[]>): Record<string, Record<string, number>> {
  const houses: Record<string, Record<string, number>> = {};
  for (const slug of HOUSE_ORDER) houses[slug] = {};
  for (const [kpiId, values] of Object.entries(byKpi)) {
    HOUSE_ORDER.forEach((slug, i) => {
      houses[slug][kpiId] = values[i];
    });
  }
  return houses;
}

const emptyByKpi: Record<string, number[]> = Object.fromEntries(
  Object.keys(P7_BY_KPI).map((k) => [k, [0, 0, 0, 0, 0, 0]])
);

// period → houseSlug → kpiId → score
export const SCORECARD: Record<string, Record<string, Record<string, number>>> = {
  P7: buildPeriod(P7_BY_KPI),
  P8: buildPeriod(emptyByKpi), // blank template; fill in and re-seed when scored
};
