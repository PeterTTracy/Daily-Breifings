// Mock operational issues for Phase 2 demo (the `issues` table is empty + RLS
// locked). Realistic items across houses and severities. Replace with live
// Supabase reads once auth + the issues pipeline land.
import { HOUSES } from './seed';

export type Severity = 'high' | 'medium' | 'low';
export type IssueStatus = 'open' | 'resolved';

export interface Issue {
  id: string;
  naturalKey: string;
  houseSlug: string;
  houseName: string;
  source: string;
  category: string;
  severity: Severity;
  title: string;
  facts: string;
  impact: string;
  action: string;
  owner: string;
  status: IssueStatus;
  openedAt: string;
  dueAt: string | null;
  escalationLevel: number;
  sensitive: boolean;
}

const nameOf = (slug: string) => HOUSES.find((h) => h.slug === slug)?.name || slug;

export const ISSUES: Issue[] = [
  {
    id: 'ISS-1042',
    naturalKey: 'new-vassar:sanitation:2026-P8',
    houseSlug: 'new-vassar',
    houseName: nameOf('new-vassar'),
    source: 'Safety Tracker',
    category: 'Quality Assurance',
    severity: 'high',
    title: 'Cold-hold temperature failure on salad line 3',
    facts:
      'A spot-check found the salad line 3 cold well holding at 48°F (limit 41°F) for an undetermined duration. Temperature logs for the morning shift were incomplete.',
    impact:
      'Elevated foodborne-illness risk. A repeat finding would convert this into a formal health-code violation at the next inspection.',
    action:
      'Pull affected product, re-train line staff on cold-hold logging, and verify thermometer calibration. Confirm corrective action by end of day.',
    owner: 'EC — New Vassar',
    status: 'open',
    openedAt: '2026-06-03',
    dueAt: '2026-06-04',
    escalationLevel: 1,
    sensitive: false,
  },
  {
    id: 'ISS-1039',
    naturalKey: 'baker:food-cost:2026-P8',
    houseSlug: 'baker',
    houseName: nameOf('baker'),
    source: 'FoodCost Visualization',
    category: 'Financial Performance',
    severity: 'high',
    title: 'Food cost 14% over budget in P8',
    facts:
      'P8 food cost ran 14% above budget, driven by protein waste on the grill station and off-contract produce purchasing during a supplier gap.',
    impact:
      'Roughly $9k over plan for the period, trending worse week-over-week. Erodes the cluster financial score.',
    action:
      'Review the waste log with the grill team, return to the contracted protein vendor, and submit a corrective purchasing plan for P9.',
    owner: 'EC — Baker',
    status: 'open',
    openedAt: '2026-06-02',
    dueAt: '2026-06-09',
    escalationLevel: 0,
    sensitive: false,
  },
  {
    id: 'ISS-1036',
    naturalKey: 'simmons:retention:2026-P8',
    houseSlug: 'simmons',
    houseName: nameOf('simmons'),
    source: 'Visier',
    category: 'Employee Relations',
    severity: 'medium',
    title: 'Two front-of-house resignations in two weeks',
    facts:
      'Two FOH team members gave notice within a two-week window, both citing schedule unpredictability. Engagement score dropped from 1.4 to 1.2.',
    impact:
      'Dinner service is short-staffed; overtime is rising to cover open shifts, compounding cost pressure.',
    action:
      'Hold retention conversations with the remaining FOH team, post the open requisitions, and review the scheduling pattern with the manager.',
    owner: 'GM — Simmons',
    status: 'open',
    openedAt: '2026-06-01',
    dueAt: '2026-06-08',
    escalationLevel: 0,
    sensitive: true,
  },
  {
    id: 'ISS-1031',
    naturalKey: 'next:overtime:2026-P8',
    houseSlug: 'next',
    houseName: nameOf('next'),
    source: 'Attendance & OT Early-Warning Dashboard',
    category: 'Financial Performance',
    severity: 'medium',
    title: 'Overtime up 22% versus budget',
    facts:
      'Overtime hours are running 22% over the budgeted level for the period, concentrated in the dish and prep stations on weekends.',
    impact:
      'Labor cost is trending over plan; sustained OT raises burnout and turnover risk.',
    action:
      'Rebalance weekend coverage, evaluate a part-time prep hire, and review the OT early-warning flags daily for two weeks.',
    owner: 'EC — Next',
    status: 'open',
    openedAt: '2026-05-30',
    dueAt: '2026-06-13',
    escalationLevel: 0,
    sensitive: false,
  },
  {
    id: 'ISS-1028',
    naturalKey: 'maseeh:allergen:2026-P8',
    houseSlug: 'maseeh',
    houseName: nameOf('maseeh'),
    source: 'Café Manager Menu Page',
    category: 'Nutrition / Programming',
    severity: 'high',
    title: 'Missing allergen tags on three menu items',
    facts:
      'Three composed-salad items published without allergen tags (tree nuts and sesame) on the digital menu board and the Café Manager page.',
    impact:
      'Allergen disclosure gap — direct guest-safety and compliance risk for students with dietary restrictions.',
    action:
      'Add the missing allergen tags immediately, audit the full menu for other gaps, and confirm the BITE labeling checklist was followed.',
    owner: 'EC — Maseeh',
    status: 'open',
    openedAt: '2026-06-03',
    dueAt: '2026-06-04',
    escalationLevel: 1,
    sensitive: false,
  },
  {
    id: 'ISS-1019',
    naturalKey: 'mccormick:compost:2026-P8',
    houseSlug: 'mccormick',
    houseName: nameOf('mccormick'),
    source: 'Café Manager Waste-Not tab',
    category: 'Sustainability',
    severity: 'low',
    title: 'Compost diversion below target',
    facts:
      'Compost diversion rate slipped to 1.3 against a target of 2.5, with contamination flagged in two end-of-night audits.',
    impact:
      'Misses the campus sustainability goal and risks contamination fees from the hauler.',
    action:
      'Re-label the back-of-house sort stations and run a 5-minute team refresher on compost vs. landfill at pre-shift.',
    owner: 'EC — McCormick',
    status: 'open',
    openedAt: '2026-05-28',
    dueAt: null,
    escalationLevel: 0,
    sensitive: false,
  },
];

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function getIssues(): Issue[] {
  return ISSUES;
}

export function getOpenIssues(): Issue[] {
  return ISSUES.filter((i) => i.status === 'open').sort((a, b) => RANK[a.severity] - RANK[b.severity]);
}

export function getIssue(id: string): Issue | null {
  return ISSUES.find((i) => i.id === id) || null;
}

export function getOpenIssuesForHouse(slug: string): Issue[] {
  return getOpenIssues().filter((i) => i.houseSlug === slug);
}
