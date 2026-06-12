// Parser for Ahmed Mueed's "Weekly Food & Labor KPIs" email (.eml).
//
// The email is a standard multipart/alternative MIME message with a text/plain
// part (human-readable summary lines) and a text/html part (5 data tables). We:
//   1. split the MIME into its parts and decode each (quoted-printable / base64),
//   2. pull headline numbers from the plaintext summary lines (most reliable —
//      Ahmed writes them by hand in a fixed format),
//   3. parse the 5 HTML tables with cheerio for the per-house breakdown,
//   4. read the week-ending date + period/week from the Subject line.
//
// Output shape (everything the Financials panel needs):
//   { source, subject, weekEnding, weekEndingLabel, period, week,
//     summary: { participation, swipes, cpm, productiveHrs, ot, laborCost },
//     houses: [{ name, totalMeals, cogs, budgetedCogs, cpm, budgetedCpm, cpmVariance }],
//     tables: { participation, swipes, foodCost, laborHours, laborCost } }
//
// Each summary metric is { actual, budget } (numbers). `tables.*` keep the raw
// header + rows so the data is recoverable even if the email layout drifts.

import * as cheerio from 'cheerio';

const HOUSES = ['Baker', 'Next', 'Simmons', 'McCormick', 'Maseeh', 'New Vassar'];

// ---------------------------------------------------------------------------
// Number / text helpers
// ---------------------------------------------------------------------------

// "$254,983" / "72.3%" / "1,182" → number. Keeps a leading minus and one dot.
function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const collapse = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const normKey = (s) => collapse(s).toLowerCase();

// ---------------------------------------------------------------------------
// MIME: split an .eml into decoded parts, find text/plain + text/html
// ---------------------------------------------------------------------------

function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function decodeBase64(str) {
  try {
    return Buffer.from(str.replace(/\s+/g, ''), 'base64').toString('utf8');
  } catch {
    return str;
  }
}

// Split a raw block into { headers (lowercased map), body }.
function splitHeaders(block) {
  const sep = block.search(/\r?\n\r?\n/);
  const rawHead = sep === -1 ? block : block.slice(0, sep);
  const body = sep === -1 ? '' : block.slice(sep).replace(/^\r?\n\r?\n/, '');

  // Unfold folded header lines (continuation lines start with whitespace).
  const unfolded = rawHead.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body };
}

function decodeBody(headers, body) {
  const enc = normKey(headers['content-transfer-encoding']);
  if (enc === 'quoted-printable') return decodeQuotedPrintable(body);
  if (enc === 'base64') return decodeBase64(body);
  return body; // 7bit / 8bit / binary / none
}

const boundaryOf = (ct) => {
  const m = /boundary="?([^";\r\n]+)"?/i.exec(ct || '');
  return m ? m[1] : null;
};

// Recursively walk multipart bodies, collecting text/plain + text/html leaves.
function collectParts(headers, body, out) {
  const ct = headers['content-type'] || 'text/plain';
  const boundary = boundaryOf(ct);

  if (/multipart\//i.test(ct) && boundary) {
    // Split on the boundary delimiters; drop the preamble and closing epilogue.
    const segments = body.split(new RegExp(`--${escapeRe(boundary)}(?:--)?\\r?\\n?`));
    for (const seg of segments) {
      if (!seg || !seg.trim()) continue;
      const { headers: h, body: b } = splitHeaders(seg);
      if (!h['content-type'] && !h['content-transfer-encoding']) continue; // preamble text
      collectParts(h, b, out);
    }
    return;
  }

  const decoded = decodeBody(headers, body);
  if (/text\/html/i.test(ct)) out.html = out.html || decoded;
  else if (/text\/plain/i.test(ct)) out.plain = out.plain || decoded;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// RFC 2047 encoded-word decoder for Subject (=?utf-8?B?..?= / =?utf-8?Q?..?=).
function decodeHeaderWord(value) {
  if (!value) return '';
  return value.replace(/=\?[^?]+\?([BbQq])\?([^?]*)\?=/g, (_, enc, text) => {
    if (enc.toUpperCase() === 'B') return decodeBase64(text);
    return decodeQuotedPrintable(text.replace(/_/g, ' '));
  });
}

function parseEml(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  const { headers, body } = splitHeaders(text);
  const out = { html: '', plain: '', subject: decodeHeaderWord(headers['subject'] || '') };
  collectParts(headers, body, out);
  // If the top level was itself a single text part, splitHeaders already gave us
  // the body; make sure it's decoded.
  if (!out.html && !out.plain) {
    const decoded = decodeBody(headers, body);
    if (/text\/html/i.test(headers['content-type'] || '')) out.html = decoded;
    else out.plain = decoded;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Subject line → date + period/week
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseSubject(subject) {
  const s = collapse(subject);
  let weekEnding = null;
  let weekEndingLabel = '';
  const dm = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (dm) {
    weekEnding = dm[0];
    const mo = Number(dm[1]);
    const day = Number(dm[2]);
    let yr = Number(dm[3]);
    if (yr < 100) yr += 2000;
    if (mo >= 1 && mo <= 12) weekEndingLabel = `${MONTHS[mo - 1]} ${day}, ${yr}`;
  }
  let period = null;
  let week = null;
  const pw = /P(\d+)\s*W(\d+)/i.exec(s);
  if (pw) {
    period = Number(pw[1]);
    week = Number(pw[2]);
  }
  return { weekEnding, weekEndingLabel, period, week };
}

// ---------------------------------------------------------------------------
// Plaintext summary lines (Ahmed's hand-written recap — fixed phrasing)
// ---------------------------------------------------------------------------

function parsePlainSummary(plain) {
  const t = collapse(plain);
  const pair = (re, isFloat) => {
    const m = re.exec(t);
    if (!m) return null;
    const a = isFloat ? parseFloat(m[1].replace(/,/g, '')) : num(m[1]);
    const b = isFloat ? parseFloat(m[2].replace(/,/g, '')) : num(m[2]);
    return { actual: a, budget: b };
  };
  return {
    participation: pair(/([\d.]+)%\s*Participation\s*vs\.?\s*Budgeted\s*([\d.]+)%/i, true),
    swipes: pair(/([\d,]+)\s*Swipes\s*vs\.?\s*Budgeted\s*([\d,]+)/i),
    cpm: pair(/run(?:ning)?\s*a?\s*\$?([\d.]+)\s*vs\.?\s*Budgeted\s*\$?([\d.]+)/i, true),
    productiveHrs: pair(/([\d,]+)\s*Productive\s*Hrs\s*vs\.?\s*Budgeted\s*([\d,]+)/i),
    ot: pair(/([\d,]+)\s*Hrs\s*of\s*OT\s*vs\.?\s*Budgeted\s*([\d,]+)/i),
    laborCost: pair(/Spent\s*\$?([\d,]+)\s*in\s*Hourly\s*Staff\s*Wages\s*vs\.?\s*Budgeted\s*\$?([\d,]+)/i),
  };
}

// ---------------------------------------------------------------------------
// HTML tables
// ---------------------------------------------------------------------------

// Turn one <table> into { headers:[], rows:[{label, cells:[]}], totalsRow }.
function readTable($, table) {
  const trs = $(table).find('tr').toArray();
  if (!trs.length) return null;

  const rowCells = (tr) =>
    $(tr)
      .find('th,td')
      .toArray()
      .map((c) => collapse($(c).text()));

  // Header = first row that has any <th>, else the first row.
  let headerIdx = trs.findIndex((tr) => $(tr).find('th').length > 0);
  if (headerIdx === -1) headerIdx = 0;
  const headers = rowCells(trs[headerIdx]);

  const rows = [];
  let totalsRow = null;
  for (let i = headerIdx + 1; i < trs.length; i++) {
    const cells = rowCells(trs[i]);
    if (!cells.length || cells.every((c) => c === '')) continue;
    const row = { label: cells[0], cells };
    if (/total/i.test(cells[0])) totalsRow = row;
    else rows.push(row);
  }
  return { headers, rows, totalsRow };
}

// Find a column index whose header satisfies `pred`. `from` skips earlier cols
// (so the *second* "Variance" / "Budgeted CPM" can be targeted past "CPM").
function colIndex(headers, pred, from = 0) {
  for (let i = from; i < headers.length; i++) if (pred(normKey(headers[i]))) return i;
  return -1;
}

// Match a table by keywords in its header cells (resilient to table order).
function classifyTable(table) {
  const h = table.headers.map(normKey).join(' | ');
  if (/part %|days\/pln|poss meals|# on plan/.test(h)) return 'participation';
  if (/board meals|swipe share|guest meals/.test(h)) return 'swipes';
  if (/cogs|cpm/.test(h)) return 'foodCost';
  if (/\bot\b|productive|budgeted regular/.test(h)) return 'laborHours';
  if (/actual wages|ptd|wages/.test(h)) return 'laborCost';
  return null;
}

const matchHouse = (label) => {
  const l = normKey(label);
  // Longest name first so "New Vassar" wins over a stray "vassar"/"next" overlap.
  for (const name of [...HOUSES].sort((a, b) => b.length - a.length)) {
    if (l.includes(name.toLowerCase())) return name;
  }
  return null;
};

// Per-house CPM breakdown from the Food Cost table.
function buildHouses(foodCost) {
  if (!foodCost) return [];
  const H = foodCost.headers;
  const iTotalMeals = colIndex(H, (h) => h.includes('total') && h.includes('meal'));
  const iCogs = colIndex(H, (h) => h === 'cogs');
  const iBudCogs = colIndex(H, (h) => h.includes('budget') && h.includes('cogs'));
  const iCpm = colIndex(H, (h) => h === 'cpm');
  const iBudCpm = colIndex(H, (h) => h.includes('budget') && h.includes('cpm'));

  return foodCost.rows
    .map((r) => {
      const name = matchHouse(r.label);
      if (!name) return null;
      const cpm = iCpm >= 0 ? num(r.cells[iCpm]) : 0;
      const budgetedCpm = iBudCpm >= 0 ? num(r.cells[iBudCpm]) : 0;
      return {
        name,
        totalMeals: iTotalMeals >= 0 ? num(r.cells[iTotalMeals]) : 0,
        cogs: iCogs >= 0 ? num(r.cells[iCogs]) : 0,
        budgetedCogs: iBudCogs >= 0 ? num(r.cells[iBudCogs]) : 0,
        cpm,
        budgetedCpm,
        cpmVariance: Math.round((cpm - budgetedCpm) * 100) / 100,
      };
    })
    .filter(Boolean);
}

function parseHtmlTables(html) {
  const tables = { participation: null, swipes: null, foodCost: null, laborHours: null, laborCost: null };
  if (!html) return tables;
  const $ = cheerio.load(html);
  const found = $('table').toArray();
  for (const el of found) {
    const t = readTable($, el);
    if (!t || !t.headers.length) continue;
    const kind = classifyTable(t);
    if (kind && !tables[kind]) tables[kind] = t;
  }
  return tables;
}

// Totals row of a table → { actual, budget } using column predicates.
function totalsPair(table, actualPred, budgetPred) {
  if (!table?.totalsRow) return null;
  const cells = table.totalsRow.cells;
  const ia = colIndex(table.headers, actualPred);
  const ib = colIndex(table.headers, budgetPred);
  if (ia < 0 || ib < 0) return null;
  return { actual: num(cells[ia]), budget: num(cells[ib]) };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function parseFinancials(input, filename = 'kpis.eml') {
  const { html, plain, subject } = parseEml(input);
  const subj = parseSubject(subject);
  const tables = parseHtmlTables(html);

  // Headline metrics: prefer the plaintext recap (fixed phrasing), fall back to
  // each table's totals row when a summary line is missing.
  const fromText = parsePlainSummary(plain);
  const summary = {
    participation:
      fromText.participation ||
      totalsPair(tables.participation, (h) => h.includes('part') && h.includes('%'), (h) => h.includes('budget')),
    swipes:
      fromText.swipes ||
      totalsPair(tables.swipes, (h) => h === 'total meals', (h) => h.includes('budget')),
    cpm: fromText.cpm || totalsPair(tables.foodCost, (h) => h === 'cpm', (h) => h.includes('budget') && h.includes('cpm')),
    productiveHrs:
      fromText.productiveHrs ||
      totalsPair(tables.laborHours, (h) => h.includes('total') && h.includes('productive') && !h.includes('budget'), (h) => h.includes('budget') && h.includes('productive')),
    ot:
      fromText.ot ||
      totalsPair(tables.laborHours, (h) => h === 'ot', (h) => h.includes('budget') && h.includes('ot')),
    laborCost:
      fromText.laborCost ||
      totalsPair(tables.laborCost, (h) => h.includes('actual') && h.includes('wages'), (h) => h.includes('budget') && h.includes('wages')),
  };

  const houses = buildHouses(tables.foodCost);

  return {
    source: filename,
    subject: collapse(subject),
    weekEnding: subj.weekEnding,
    weekEndingLabel: subj.weekEndingLabel,
    period: subj.period,
    week: subj.week,
    summary,
    houses,
    tables,
  };
}
