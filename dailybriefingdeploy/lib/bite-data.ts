// Student BITE survey results — May 2026 (39 responses). Feeds the Customer
// Satisfaction KPIs. Ratings on a 1–5 scale; star average maps to the 0–3
// scorecard scale via starsTo03().
export interface BiteHouse {
  slug: string;
  responses: number;
  stars: number;
  taste: number;
  texture: number;
  aroma: number;
  presentation: number;
  balanced: number;
}

export const BITE_MONTH = 'May 2026';
export const BITE_TOTAL_RESPONSES = 39;
export const BITE_CAMPUS_AVG = 3.49;

// Keyed by house slug. (McCormick retained for reference but it's deactivated,
// so it never renders.)
export const BITE_SURVEY: Record<string, BiteHouse> = {
  baker: { slug: 'baker', responses: 9, stars: 3.11, taste: 3.22, texture: 2.89, aroma: 3.44, presentation: 3.44, balanced: 3.0 },
  maseeh: { slug: 'maseeh', responses: 7, stars: 3.0, taste: 3.29, texture: 3.0, aroma: 3.14, presentation: 3.57, balanced: 2.67 },
  mccormick: { slug: 'mccormick', responses: 6, stars: 2.67, taste: 2.33, texture: 2.5, aroma: 3.33, presentation: 2.83, balanced: 3.0 },
  'new-vassar': { slug: 'new-vassar', responses: 9, stars: 3.89, taste: 4.0, texture: 3.89, aroma: 3.44, presentation: 3.78, balanced: 4.25 },
  next: { slug: 'next', responses: 6, stars: 4.5, taste: 4.5, texture: 4.17, aroma: 3.83, presentation: 4.0, balanced: 4.33 },
  simmons: { slug: 'simmons', responses: 2, stars: 4.5, taste: 4.5, texture: 4.5, aroma: 4.5, presentation: 4.5, balanced: 5.0 },
};

export function getBite(slug: string): BiteHouse | null {
  return BITE_SURVEY[slug] || null;
}

/** Map a 1–5 star average onto the 0–3 scorecard scale. */
export const starsTo03 = (stars: number) => (stars / 5) * 3;
