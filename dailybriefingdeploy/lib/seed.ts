// Seed data for the MIT Dining Operations Platform.
// Houses, categories, and the 20 scorecard KPIs from Pete's spec.
// Scoring thresholds and color logic live in lib/scoring.ts.

export type HouseType = 'residential' | 'cluster' | 'retail';

export interface House {
  slug: string;
  name: string;
  type: HouseType;
  parent?: string | null; // parent cluster slug (for retail child cafés)
  parentSlug?: string | null;
  ec_name?: string; // Executive Chef — placeholder until real assignments land
  contact?: string;
  active?: boolean;
}

export const HOUSES: House[] = [
  { slug: 'maseeh', name: 'Maseeh', type: 'residential', ec_name: 'TBD', contact: 'TBD', active: true },
  { slug: 'baker', name: 'Baker', type: 'residential', ec_name: 'TBD', contact: 'TBD', active: true },
  // McCormick is offline for ~2 years — deactivated (data kept, hidden everywhere).
  // Flip active back to true to restore it.
  { slug: 'mccormick', name: 'McCormick', type: 'residential', ec_name: 'TBD', contact: 'TBD', active: false },
  { slug: 'next', name: 'Next', type: 'residential', ec_name: 'TBD', contact: 'TBD', active: true },
  { slug: 'simmons', name: 'Simmons', type: 'residential', ec_name: 'TBD', contact: 'TBD', active: true },
  { slug: 'new-vassar', name: 'New Vassar', type: 'residential', ec_name: 'TBD', contact: 'TBD', active: true },
  { slug: 'retail', name: 'Retail', type: 'cluster', ec_name: 'TBD', contact: 'TBD', active: true },
  // Retail child cafés — roll up into the Retail cluster (shown inside /house/retail,
  // not as separate Portfolio cards).
  { slug: 'forbes', name: 'Forbes Family Café', type: 'retail', parent: 'retail', active: true },
  { slug: 'deans-beans', name: "Dean's Beans", type: 'retail', parent: 'retail', active: true },
  { slug: 'bosworths', name: "Bosworth's", type: 'retail', parent: 'retail', active: true },
];

export const HOUSE_SLUGS = HOUSES.map((h) => h.slug);

export interface Category {
  key: string;
  name: string;
  short: string;
  /** Weight as a percentage of the overall portfolio score. Spec weights sum to ~100. */
  weight: number;
}

export const CATEGORIES: Category[] = [
  { key: 'nutrition_programming', name: 'Nutrition / Programming', short: 'Nutr', weight: 23.8 },
  { key: 'financial_performance', name: 'Financial Performance', short: 'Fin', weight: 25.0 },
  { key: 'quality_assurance', name: 'Quality Assurance', short: 'QA', weight: 20.0 },
  { key: 'employee_relations', name: 'Employee Relations', short: 'Emp', weight: 14.5 },
  { key: 'customer_satisfaction', name: 'Customer Satisfaction', short: 'Cust', weight: 12.0 },
  { key: 'sustainability', name: 'Sustainability', short: 'Sust', weight: 4.8 },
];

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

// Owning team per category (from the "Individual House Scorecard" Owner column).
export const CATEGORY_OWNERS: Record<CategoryKey, string> = {
  nutrition_programming: 'Culinary and Wellness Team',
  sustainability: 'Culinary and Wellness Team',
  financial_performance: 'Operations and Financial Teams',
  quality_assurance: 'Operations and Culinary Team',
  customer_satisfaction: 'Operations and Culinary Team',
  employee_relations: 'Operations and Culinary Team',
};

export interface Kpi {
  id: string;
  category: CategoryKey;
  name: string;
  /** Equal weight within each category for now (percent, sums to ~100 per category). */
  weightWithinCategory: number;
  signal_source: string;
  /** Per spec, store the signal-source string as the measurement mechanic for now. */
  measurement_mechanic: string;
  /** Owning team (derived from category). */
  owner: string;
}

// 20 KPIs from the spec, defined without owner; owner is injected by category below.
const KPI_DEFS: Omit<Kpi, 'owner'>[] = [
  // Nutrition / Programming (2 KPIs → 50% each)
  { id: 'menu_compliance', category: 'nutrition_programming', name: 'Menu Compliance / BITE Standards', weightWithinCategory: 50, signal_source: 'Café Manager Menu Page', measurement_mechanic: 'Café Manager Menu Page' },
  { id: 'special_diet_allergen', category: 'nutrition_programming', name: 'Special Diet & Allergen Execution', weightWithinCategory: 50, signal_source: 'Café Manager Menu Page', measurement_mechanic: 'Café Manager Menu Page' },

  // Financial Performance (5 KPIs → 20% each)
  { id: 'food_cost_vs_budget', category: 'financial_performance', name: 'Food Cost vs Budget', weightWithinCategory: 20, signal_source: 'FoodCost Visualization', measurement_mechanic: 'FoodCost Visualization' },
  { id: 'labor_cost_vs_budget', category: 'financial_performance', name: 'Labor Cost vs Budget', weightWithinCategory: 20, signal_source: 'FY26 Labor Hours vs Budgeted', measurement_mechanic: 'FY26 Labor Hours vs Budgeted' },
  { id: 'cost_per_meal', category: 'financial_performance', name: 'Cost per Meal', weightWithinCategory: 20, signal_source: 'FoodCost Visualization', measurement_mechanic: 'FoodCost Visualization' },
  { id: 'overtime_control', category: 'financial_performance', name: 'Overtime Control', weightWithinCategory: 20, signal_source: 'Attendance & OT Early-Warning Dashboard', measurement_mechanic: 'Attendance & OT Early-Warning Dashboard' },
  { id: 'inventory_accuracy', category: 'financial_performance', name: 'Inventory Accuracy', weightWithinCategory: 20, signal_source: 'MyFi Cost of Goods vs physical counts', measurement_mechanic: 'MyFi Cost of Goods vs physical counts' },

  // Quality Assurance (5 KPIs → 20% each)
  { id: 'sanitation_cleanliness', category: 'quality_assurance', name: 'Sanitation & Cleanliness', weightWithinCategory: 20, signal_source: 'Safety Tracker / training reset → Ladle (future)', measurement_mechanic: 'Safety Tracker / training reset → Ladle (future)' },
  { id: 'hygiene_compliance', category: 'quality_assurance', name: 'Hygiene Compliance', weightWithinCategory: 20, signal_source: 'Safety Tracker / training reset', measurement_mechanic: 'Safety Tracker / training reset' },
  { id: 'ppe_compliance', category: 'quality_assurance', name: 'PPE Compliance', weightWithinCategory: 20, signal_source: 'Safety Tracker / training reset', measurement_mechanic: 'Safety Tracker / training reset' },
  { id: 'logs_completion', category: 'quality_assurance', name: 'Logs Completion', weightWithinCategory: 20, signal_source: 'Safety Tracker → Ladle (future)', measurement_mechanic: 'Safety Tracker → Ladle (future)' },
  { id: 'pic_required_trainings', category: 'quality_assurance', name: 'PIC / Required Trainings', weightWithinCategory: 20, signal_source: 'Food Safety Training Compliance', measurement_mechanic: 'Food Safety Training Compliance' },

  // Employee Relations (3 KPIs → 33.33% each)
  { id: 'attendance_reliability', category: 'employee_relations', name: 'Attendance / Reliability', weightWithinCategory: 33.33, signal_source: 'Track Path occurrence report', measurement_mechanic: 'Track Path occurrence report' },
  { id: 'training_development', category: 'employee_relations', name: 'Training & Development', weightWithinCategory: 33.33, signal_source: 'LMS Group Training Tracker', measurement_mechanic: 'LMS Group Training Tracker' },
  { id: 'engagement_retention', category: 'employee_relations', name: 'Engagement / Retention', weightWithinCategory: 33.33, signal_source: 'Visier', measurement_mechanic: 'Visier' },

  // Customer Satisfaction (2 KPIs → 50% each)
  { id: 'guest_satisfaction_survey', category: 'customer_satisfaction', name: 'Guest Satisfaction Survey', weightWithinCategory: 50, signal_source: 'Student BITE', measurement_mechanic: 'Student BITE' },
  { id: 'service_recovery_complaints', category: 'customer_satisfaction', name: 'Service Recovery / Complaints', weightWithinCategory: 50, signal_source: 'Emails, comment cards', measurement_mechanic: 'Emails, comment cards' },

  // Sustainability (3 KPIs → 33.33% each)
  { id: 'waste_diversion_recycling', category: 'sustainability', name: 'Waste Diversion / Recycling', weightWithinCategory: 33.33, signal_source: 'Café Manager Waste-Not tab', measurement_mechanic: 'Café Manager Waste-Not tab' },
  { id: 'local_sustainable_sourcing', category: 'sustainability', name: 'Local / Sustainable Sourcing', weightWithinCategory: 33.33, signal_source: 'Café Manager Purchasing tab', measurement_mechanic: 'Café Manager Purchasing tab' },
  { id: 'climate_change', category: 'sustainability', name: 'Climate Change', weightWithinCategory: 33.33, signal_source: 'Café Manager Climate Change', measurement_mechanic: 'Café Manager Climate Change' },
];

export const KPIS: Kpi[] = KPI_DEFS.map((k) => ({ ...k, owner: CATEGORY_OWNERS[k.category] }));

/** KPIs grouped by category key. */
export function kpisByCategory(): Record<string, Kpi[]> {
  return KPIS.reduce((acc, kpi) => {
    (acc[kpi.category] ||= []).push(kpi);
    return acc;
  }, {} as Record<string, Kpi[]>);
}
