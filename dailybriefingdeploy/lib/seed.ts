// Seed data for the MIT Dining Operations Platform.
// Houses, categories, KPIs, and scoring thresholds from the platform spec.
//
// ⚠️ KPI NAMES BELOW ARE PLACEHOLDERS. The category weights, house list, and
// thresholds are taken verbatim from the spec; the 20 KPI definitions are a
// reasonable scaffold distributed across the categories and MUST be replaced
// with the exact KPI list from the spec. Search for "TODO(spec)" to find them.

export type HouseType = 'residential' | 'cluster';

export interface House {
  slug: string;
  name: string;
  type: HouseType;
}

export const HOUSES: House[] = [
  { slug: 'maseeh', name: 'Maseeh', type: 'residential' },
  { slug: 'baker', name: 'Baker', type: 'residential' },
  { slug: 'mccormick', name: 'McCormick', type: 'residential' },
  { slug: 'next', name: 'Next', type: 'residential' },
  { slug: 'simmons', name: 'Simmons', type: 'residential' },
  { slug: 'new-vassar', name: 'New Vassar', type: 'residential' },
  { slug: 'retail', name: 'Retail', type: 'cluster' },
];

export const HOUSE_SLUGS = HOUSES.map((h) => h.slug);

export interface Category {
  key: string;
  name: string;
  /** Weight as a percentage of the overall score. Spec weights sum to ~100. */
  weight: number;
}

export const CATEGORIES: Category[] = [
  { key: 'nutrition_programming', name: 'Nutrition / Programming', weight: 23.8 },
  { key: 'financial_performance', name: 'Financial Performance', weight: 25.0 },
  { key: 'quality_assurance', name: 'Quality Assurance', weight: 20.0 },
  { key: 'employee_relations', name: 'Employee Relations', weight: 14.5 },
  { key: 'customer_satisfaction', name: 'Customer Satisfaction', weight: 12.0 },
  { key: 'sustainability', name: 'Sustainability', weight: 4.8 },
];

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

export type KpiDirection = 'higher_better' | 'lower_better';

export interface Kpi {
  id: string;
  name: string;
  category: CategoryKey;
  unit?: string;
  direction: KpiDirection;
}

// TODO(spec): replace the 20 placeholder KPIs below with the exact definitions
// from the spec. Distribution: Financial 4, Nutrition/Programming 4, Quality 4,
// Employee Relations 3, Customer Satisfaction 3, Sustainability 2 = 20.
export const KPIS: Kpi[] = [
  // Financial Performance (4)
  { id: 'fin_food_cost', name: 'Food cost % of revenue', category: 'financial_performance', unit: '%', direction: 'lower_better' },
  { id: 'fin_labor_cost', name: 'Labor cost % of revenue', category: 'financial_performance', unit: '%', direction: 'lower_better' },
  { id: 'fin_budget_variance', name: 'Budget variance', category: 'financial_performance', unit: '%', direction: 'lower_better' },
  { id: 'fin_waste', name: 'Food waste %', category: 'financial_performance', unit: '%', direction: 'lower_better' },

  // Nutrition / Programming (4)
  { id: 'nut_menu_cycle', name: 'Menu cycle compliance', category: 'nutrition_programming', unit: '%', direction: 'higher_better' },
  { id: 'nut_labeling', name: 'Nutritional labeling accuracy', category: 'nutrition_programming', unit: '%', direction: 'higher_better' },
  { id: 'nut_special_diet', name: 'Special-diet request fulfillment', category: 'nutrition_programming', unit: '%', direction: 'higher_better' },
  { id: 'nut_programming', name: 'Programming events held', category: 'nutrition_programming', unit: 'count', direction: 'higher_better' },

  // Quality Assurance (4)
  { id: 'qa_health_inspection', name: 'Health inspection score', category: 'quality_assurance', unit: 'score', direction: 'higher_better' },
  { id: 'qa_food_safety_audit', name: 'Internal food-safety audit', category: 'quality_assurance', unit: '%', direction: 'higher_better' },
  { id: 'qa_temp_logs', name: 'Temperature log compliance', category: 'quality_assurance', unit: '%', direction: 'higher_better' },
  { id: 'qa_recipe_adherence', name: 'Recipe adherence', category: 'quality_assurance', unit: '%', direction: 'higher_better' },

  // Employee Relations (3)
  { id: 'emp_turnover', name: 'Staff turnover rate', category: 'employee_relations', unit: '%', direction: 'lower_better' },
  { id: 'emp_training', name: 'Training completion rate', category: 'employee_relations', unit: '%', direction: 'higher_better' },
  { id: 'emp_shifts_filled', name: 'Open shifts filled', category: 'employee_relations', unit: '%', direction: 'higher_better' },

  // Customer Satisfaction (3)
  { id: 'cust_survey', name: 'Student satisfaction survey', category: 'customer_satisfaction', unit: 'score', direction: 'higher_better' },
  { id: 'cust_nps', name: 'Net promoter score', category: 'customer_satisfaction', unit: 'nps', direction: 'higher_better' },
  { id: 'cust_complaint_time', name: 'Complaint resolution time', category: 'customer_satisfaction', unit: 'hrs', direction: 'lower_better' },

  // Sustainability (2)
  { id: 'sus_compost', name: 'Compost diversion rate', category: 'sustainability', unit: '%', direction: 'higher_better' },
  { id: 'sus_local', name: 'Local sourcing %', category: 'sustainability', unit: '%', direction: 'higher_better' },
];

export type Score = 'green' | 'yellow' | 'red';

// Scoring thresholds on the spec's 1–3 scale.
export const THRESHOLDS = {
  green: 2.5, // >= 2.5
  yellow: 1.5, // 1.5 – 2.49 (below green)
  // red: < 1.5
};

/** Map a numeric score (1–3 scale) to a status color. */
export function scoreToColor(value: number): Score {
  if (value >= THRESHOLDS.green) return 'green';
  if (value >= THRESHOLDS.yellow) return 'yellow';
  return 'red';
}

/** Convenience: KPIs grouped by category key. */
export function kpisByCategory(): Record<string, Kpi[]> {
  return KPIS.reduce((acc, kpi) => {
    (acc[kpi.category] ||= []).push(kpi);
    return acc;
  }, {} as Record<string, Kpi[]>);
}
