// Parser for the TechCash "MP Clicks By Loc and day" export
// (MPClicksByLocandDay.XLSX). The workbook is a multi-section pivot:
//
//   rows 0-14   header / meal-plan definitions
//   row  15     date headers (7 days + "Total")
//   rows 16-25  BY LOCATION   (dining halls, then subtotals + Grand Total)
//   rows 28-63  BY MEAL PERIOD (Breakfast/Brunch/Lunch/Dinner/LateNight × loc)
//   rows 66-101 BY MEAL PLAN
//   rows 104+   BY 15 MINUTES
//
// Rather than hard-code row numbers (which drift between exports), this parser
// finds the date-header row by its "Total" column, then locates each section
// by its row labels. That keeps it working if rows shift by a few.
//
// Output shape (everything the dashboard panel needs):
//   { source, weekLabel, weekTotal, dailyTrend[{label,total}],
//     byLocation[{name,total}] (desc), byMealPeriod[{name,total}] (desc) }

import * as XLSX from 'xlsx';

// Dining halls as they appear in col A of the "By Location" section. We iterate
// this list (not "every row") so the subtotal/total rows are naturally excluded.
const LOCATIONS = [
  'Deans Beans Stata',
  'BA-Baker Dining',
  'BA-Maseeh Hall',
  'BA-McCormick Dining',
  'BA-New Vassar Dining',
  'BA-Next House Dining',
  'BA-Simmons Dining',
];

const MEAL_PERIODS = ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'LateNight'];

const norm = (v) => (v == null ? '' : String(v).trim());
const normKey = (v) => norm(v).toLowerCase().replace(/\s+/g, ' ');

// Cells in count columns may be numbers, blank, or comma-formatted strings.
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// "BA-Maseeh Hall" → "Maseeh Hall". Leaves "Deans Beans Stata" untouched.
const pretty = (name) => norm(name).replace(/^BA-\s*/i, '');

// Date headers come through as JS Dates (cellDates:true), pre-formatted strings,
// or — defensively — Excel serial numbers.
function dayLabel(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
  }
  if (typeof v === 'number' && v > 0) {
    // Excel serial → JS Date (epoch 1899-12-30).
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    }
  }
  return norm(v);
}

// Locate the date-header row by its trailing "Total" column. Returns the row
// index, the column index of "Total", and the columns holding the 7 day cells.
function findHeader(grid) {
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    const row = grid[r] || [];
    const totalCol = row.findIndex((c) => normKey(c) === 'total');
    if (totalCol > 0) {
      const dayCols = [];
      for (let c = 1; c < totalCol; c++) {
        if (norm(row[c]) !== '') dayCols.push(c);
      }
      if (dayCols.length >= 3) return { headerRow: r, totalCol, dayCols };
    }
  }
  return null;
}

export function parseMealClicks(input, filename = 'MPClicksByLocandDay.XLSX') {
  const wb = XLSX.read(input, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Workbook has no sheets.');
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  const header = findHeader(grid);
  if (!header) {
    throw new Error('Could not find the date-header row (expected a "Total" column). Is this the MPClicksByLocandDay export?');
  }
  const { headerRow, totalCol, dayCols } = header;
  const days = dayCols.map((c) => ({ label: dayLabel(grid[headerRow][c]), col: c }));

  const readRow = (rowIdx) => {
    const row = grid[rowIdx] || [];
    return {
      days: dayCols.map((c) => num(row[c])),
      total: num(row[totalCol]),
    };
  };

  // Find a row by its (normalized) label in any of the first few columns.
  const findLabel = (label, from = headerRow + 1, to = grid.length) => {
    const key = normKey(label);
    for (let r = from; r < to; r++) {
      const row = grid[r] || [];
      for (let c = 0; c < 3; c++) {
        if (normKey(row[c]) === key) return r;
      }
    }
    return -1;
  };

  // BY LOCATION — weekly totals per dining hall, sorted descending.
  const byLocation = LOCATIONS.map((name) => {
    const r = findLabel(name);
    if (r === -1) return null;
    return { name: pretty(name), total: readRow(r).total };
  })
    .filter((l) => l && l.total > 0)
    .sort((a, b) => b.total - a.total);

  // GRAND TOTAL row → week total + the 7-day trend.
  const grandRow = findLabel('Grand Total');
  let weekTotal = 0;
  let dailyTrend;
  if (grandRow !== -1) {
    const g = readRow(grandRow);
    weekTotal = g.total;
    dailyTrend = days.map((d, i) => ({ label: d.label, total: g.days[i] }));
  } else {
    // Fallback: derive the week total from the locations we found.
    weekTotal = byLocation.reduce((s, l) => s + l.total, 0);
    dailyTrend = days.map((d) => ({ label: d.label, total: 0 }));
  }

  // BY MEAL PERIOD — search below the location section. The period subtotal may
  // sit on the period-name row itself or on a "<Period> Total" row.
  const mealStart = grandRow !== -1 ? grandRow + 1 : headerRow + 1;
  const byMealPeriod = MEAL_PERIODS.map((name) => {
    let total = 0;
    const r = findLabel(name, mealStart);
    if (r !== -1) total = readRow(r).total;
    if (total === 0) {
      const r2 = findLabel(`${name} Total`, mealStart);
      if (r2 !== -1) total = readRow(r2).total;
    }
    return { name, total };
  })
    .filter((m) => m.total > 0)
    .sort((a, b) => b.total - a.total);

  const weekLabel = days.length ? `${days[0].label} – ${days[days.length - 1].label}` : '';

  return {
    source: filename,
    weekLabel,
    weekTotal,
    dailyTrend,
    byLocation,
    byMealPeriod,
  };
}
