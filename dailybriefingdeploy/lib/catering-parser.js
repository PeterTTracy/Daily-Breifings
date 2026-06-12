// Parser for Pete's weekly CaterTrax "Invoice Report" PDF
// (shopa_print_all_invoices.asp). The export bundles every catering event for a
// week, each as a 1-2 page invoice. We:
//   1. extract a newline-structured text layer with unpdf (see extractText),
//   2. split it into per-invoice chunks on the "Invoice #" marker (one per event),
//   3. pull labeled fields out of each chunk with tolerant regexes,
//   4. group the events by day and roll up the weekly totals.
//
// The field labels in CaterTrax PDFs are reasonably stable ("Event Date:",
// "Guest Count:", "Balance Due:", …) but spacing/line-wrapping from the PDF text
// layer is not, so every extractor collapses whitespace first, accepts a few
// label variants, and tolerates the value landing on the next line. Missing
// fields degrade to null/0 rather than throwing — one malformed invoice
// shouldn't sink the whole report, and a report we can't make sense of returns
// an empty (but valid) result with a warning instead of erroring.
//
// We use unpdf rather than pdf-parse because pdf-parse drags in pdfjs's worker,
// which fails to resolve in bundled/serverless runtimes (Vercel) and crashes the
// function with an empty response. unpdf ships a worker-free pdfjs build that
// runs in-process, so there's nothing to mis-bundle.
//
// Output shape (everything the Catering panel needs):
//   { source, startDate, endDate, dateRangeLabel, weekRevenue, totalEvents,
//     totalGuests, warning?,
//     events:[{ orderName, invoiceNumber, eventDate, dateISO, dayOfWeek,
//               status, building, room, guestCount, startTime, endTime,
//               deliveryTime, customerName, department, balanceDue, special }],
//     days:[{ dateISO, dayLabel, dateLabel, events:[…], revenue, guests }] }

import { getDocumentProxy, extractText as unpdfExtractText } from 'unpdf';
import { load as cheerioLoad } from 'cheerio';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ---------------------------------------------------------------------------
// Text / number helpers
// ---------------------------------------------------------------------------

const collapse = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

// "$10,200.00" / "1,182" → number. Keeps a leading minus and one dot.
function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// First capture group of the first matching regex, collapsed. null if none hit.
function firstMatch(text, regexes) {
  for (const re of regexes) {
    const m = re.exec(text);
    if (m && m[1] != null && collapse(m[1]) !== '') return collapse(m[1]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

// "Sunday, 6/14/2026" (or just "6/14/2026") → { iso, label, dayOfWeek, mdy }.
// iso is YYYY-MM-DD for stable sorting/grouping; label is "Sun, Jun 14".
function parseEventDate(raw) {
  if (!raw) return null;
  const s = collapse(raw);
  const dm = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(s);
  if (!dm) return null;
  const mo = Number(dm[1]);
  const day = Number(dm[2]);
  let yr = Number(dm[3]);
  if (yr < 100) yr += 2000;
  if (!(mo >= 1 && mo <= 12) || !(day >= 1 && day <= 31)) return null;

  // Prefer the weekday spelled out in the source; fall back to computing it.
  const wm = new RegExp(`(${WEEKDAYS.join('|')})`, 'i').exec(s);
  let dayOfWeek = wm ? wm[1][0].toUpperCase() + wm[1].slice(1).toLowerCase() : null;
  // Construct in UTC so the calendar date never shifts across the local offset.
  const d = new Date(Date.UTC(yr, mo - 1, day));
  if (!dayOfWeek && !Number.isNaN(d.getTime())) dayOfWeek = WEEKDAYS[d.getUTCDay()];

  const iso = `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const label = `${dayOfWeek ? dayOfWeek.slice(0, 3) + ', ' : ''}${MONTHS[mo - 1]} ${day}`;
  return { iso, label, dayOfWeek, mo, day, yr };
}

// "2026-06-14" → "6/14" for the compact range header.
function isoToShort(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${Number(m[2])}/${Number(m[3])}`;
}

// ---------------------------------------------------------------------------
// Per-invoice field extraction
// ---------------------------------------------------------------------------

// Build label-matching regexes that grab the value after "Label:" up to the next
// newline or the next known label. Tolerant of optional "#" and spacing.
function labeled(...labels) {
  return labels.map(
    (l) => new RegExp(`${l}\\s*#?\\s*:?\\s*([^\\n\\r]+)`, 'i')
  );
}

// A line that's a labeled field, money/date/number, or report boilerplate —
// i.e. NOT an Order Name title. Used to bound the title look-behind.
function isFieldLike(t) {
  if (t === '') return true;
  if (/:/.test(t)) return true; // "Label: value"
  if (/^[#$\d.,\s/\-]+$/.test(t)) return true; // pure number / money / date / range
  return /balance\s*due|grand\s*total|subtotal|thank you|page\s*\d|invoice\s*report|catering\s*invoice/i.test(t);
}

// The Order Name is the centered title line(s) directly above the "Invoice #"
// marker. Walk upward from the marker through `region` (the gap since the
// previous invoice), skipping a trailing blank, collecting up to two non-field
// lines, and stopping at the first field-like line so we never reach into the
// previous event's footer or the report header.
function extractTitle(region) {
  const lines = region.split(/\r?\n/).map(collapse);
  const out = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i];
    if (t === '') {
      if (out.length) break; // blank above the collected title — done
      continue; // skip blank(s) directly above the marker
    }
    if (isFieldLike(t)) break;
    out.unshift(t);
    if (out.length >= 2) break; // titles are at most a couple of lines
  }
  return out.join(' ').trim() || null;
}

// Parse one event. `fieldText` is the slice from this invoice's marker to the
// next (all of its labeled fields live here); `title` is the Order Name pulled
// from the line(s) above the marker. An explicit "Order Name:" label wins.
function parseInvoice(fieldText, title) {
  const text = fieldText; // keep newlines for line-based fallbacks

  const invoiceNumber = firstMatch(text, [
    /Invoice\s*#?\s*:?\s*#?(\d{3,7})/i,
    /#(\d{4,6})/,
  ]);

  const rawDate = firstMatch(text, [
    new RegExp(`Event\\s*Date\\s*:?\\s*((?:${WEEKDAYS.join('|')})?,?\\s*\\d{1,2}/\\d{1,2}/\\d{2,4})`, 'i'),
    /Event\s*Date\s*:?\s*([^\n\r]+)/i,
    // last resort: any "Weekday, m/d/yyyy" anywhere in the chunk
    new RegExp(`((?:${WEEKDAYS.join('|')}),\\s*\\d{1,2}/\\d{1,2}/\\d{2,4})`, 'i'),
  ]);
  const date = parseEventDate(rawDate);

  const guestRaw = firstMatch(text, labeled('Guest\\s*Count', 'Guests', 'Guest\\s*#'));
  const balanceRaw = firstMatch(text, labeled('Balance\\s*Due', 'Amount\\s*Due', 'Total\\s*Due'));

  const explicitName = firstMatch(text, labeled('Order\\s*Name'));
  const orderName =
    explicitName || title || (invoiceNumber ? `Invoice #${invoiceNumber}` : 'Catering Event');

  return {
    orderName,
    invoiceNumber: invoiceNumber ? `#${invoiceNumber}` : null,
    eventDate: rawDate ? collapse(rawDate) : null,
    dateISO: date?.iso || null,
    dayOfWeek: date?.dayOfWeek || null,
    dateLabel: date?.label || null,
    status: firstMatch(text, labeled('Status')),
    building: firstMatch(text, labeled('Building', 'Location')),
    room: firstMatch(text, labeled('Room\\s*#', 'Room')),
    guestCount: guestRaw ? num(guestRaw) : 0,
    startTime: firstMatch(text, labeled('Event\\s*Start\\s*Time', 'Start\\s*Time')),
    endTime: firstMatch(text, labeled('Event\\s*End\\s*Time', 'End\\s*Time')),
    deliveryTime: firstMatch(text, labeled('Food\\s*Delivery\\s*Time', 'Delivery\\s*Time')),
    customerName: firstMatch(text, labeled('Customer\\s*Name', 'Contact\\s*Name', 'Customer')),
    department: firstMatch(text, labeled('Department', 'Dept')),
    balanceDue: balanceRaw ? num(balanceRaw) : 0,
    special: firstMatch(text, [/Special\s*Instructions\s*:?\s*([^\n\r]+)/i]),
  };
}

// ---------------------------------------------------------------------------
// Splitting the report into invoices
// ---------------------------------------------------------------------------

// Each event invoice contains exactly one "Invoice #NNNNN". We locate every
// marker, then for each event slice its field block (marker → next marker) and
// pull its Order Name title from the line(s) directly above the marker. Keeping
// fields strictly after the marker means one event's footer (special
// instructions, balance) can never bleed into the next event's title region.
function splitInvoices(fullText) {
  // Primary: the "Invoice #NNNNN" label. Fallback: a bare "#NNNNN" token, in
  // case the real export prints the number without the word "Invoice" next to
  // it (different text-layer ordering). Whichever finds more markers wins.
  const byLabel = markerStarts(fullText, /Invoice\s*#?\s*:?\s*#?\d{3,7}/gi);
  const byHash = markerStarts(fullText, /(?:^|\s)#\s?\d{4,6}\b/g);
  const lineStarts = byHash.length > byLabel.length ? byHash : byLabel;
  if (!lineStarts.length) return [];

  return lineStarts.map((start, i) => {
    const end = i + 1 < lineStarts.length ? lineStarts[i + 1] : fullText.length;
    const titleFloor = i === 0 ? 0 : lineStarts[i - 1];
    return {
      fieldText: fullText.slice(start, end),
      title: extractTitle(fullText.slice(titleFloor, start)),
    };
  });
}

// Collect the line-start offset for every match of `re`, de-duplicated (a
// fallback pattern can match the same line twice).
function markerStarts(fullText, re) {
  const starts = [];
  let m;
  while ((m = re.exec(fullText)) !== null) {
    const idx = m.index + (m[0].length - m[0].trimStart().length); // skip leading ws the pattern ate
    const nl = fullText.lastIndexOf('\n', idx);
    const start = nl === -1 ? 0 : nl + 1;
    if (starts[starts.length - 1] !== start) starts.push(start);
  }
  return starts;
}

// ---------------------------------------------------------------------------
// Date range for the report header
// ---------------------------------------------------------------------------

// Try an explicit range printed in the PDF ("6/14/2026 - 6/20/2026" or
// "startDate=… endDate=…"); otherwise derive it from the event dates.
function deriveRange(fullText, events) {
  const explicit = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|–|to|through)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i.exec(fullText)
    || /startDate=(\d{1,2}\/\d{1,2}\/\d{2,4}).*?endDate=(\d{1,2}\/\d{1,2}\/\d{2,4})/i.exec(fullText);
  if (explicit) {
    const a = parseEventDate(explicit[1]);
    const b = parseEventDate(explicit[2]);
    if (a && b) return { startDate: a.iso, endDate: b.iso };
  }
  const isos = events.map((e) => e.dateISO).filter(Boolean).sort();
  if (isos.length) return { startDate: isos[0], endDate: isos[isos.length - 1] };
  return { startDate: null, endDate: null };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

// Extract a newline-structured text layer with unpdf's worker-free pdfjs.
// unpdf's own extractText() joins items with spaces and loses line structure,
// which the invoice splitter depends on — so we walk the text items ourselves
// and insert a line break whenever an item flags hasEOL or its baseline y jumps.
//
// Returns the text plus diagnostics (page count, number of text fragments seen)
// so an export that yields no usable text can be told apart from a layout the
// parser simply doesn't recognize: 0 fragments ⇒ image/scanned or a font with
// no Unicode mapping; many fragments but no invoices ⇒ a layout difference.
async function extractText(buffer) {
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const lines = [];
  let totalPages = 0;
  let fragments = 0;
  try {
    totalPages = doc.numPages;
    for (let p = 1; p <= totalPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      let line = '';
      let lastY = null;
      for (const it of content.items) {
        if (typeof it?.str !== 'string') continue;
        if (it.str !== '') fragments++;
        const y = Array.isArray(it.transform) ? it.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          lines.push(line);
          line = '';
        }
        line += it.str;
        if (it.hasEOL) {
          lines.push(line);
          line = '';
          lastY = null;
        } else {
          lastY = y;
        }
      }
      if (line) lines.push(line);
      lines.push(''); // page break
    }
  } finally {
    // Free pdfjs internals; ignore if the build doesn't expose destroy().
    try { await doc.destroy?.(); } catch {}
  }

  let text = lines.join('\n');

  // Fallback: if our line reconstruction came up empty, try unpdf's own
  // extractor (space-joined). If it sees text our walk missed, use it — the
  // flat text still parses, just without title-above-marker precision.
  if (!text.trim()) {
    try {
      const alt = await unpdfExtractText(await getDocumentProxy(new Uint8Array(buffer)), { mergePages: true });
      if (alt?.text && alt.text.trim()) text = alt.text;
    } catch {
      // ignore — diagnostics below will report the empty extraction
    }
  }

  return { text, totalPages, fragments };
}

// Assemble the final result object from a (possibly empty) list of events.
// `diag` ({ totalPages, fragments }) is attached only on the warning paths so a
// non-parsing upload is diagnosable from the UI.
function buildResult(filename, fullText, events, warning, diag = {}) {
  const { startDate, endDate } = deriveRange(fullText, events);

  // Group by day, chronologically.
  const byIso = new Map();
  for (const e of events) {
    const key = e.dateISO || 'undated';
    if (!byIso.has(key)) byIso.set(key, []);
    byIso.get(key).push(e);
  }
  const days = [...byIso.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([iso, evs]) => {
      const first = evs[0];
      const dayLabel = first?.dayOfWeek || (iso === 'undated' ? 'Undated' : iso);
      const dateLabel = first?.dateLabel || (iso === 'undated' ? '' : isoToShort(iso));
      return {
        dateISO: iso === 'undated' ? null : iso,
        dayLabel,
        dateLabel,
        events: evs,
        revenue: evs.reduce((s, e) => s + e.balanceDue, 0),
        guests: evs.reduce((s, e) => s + e.guestCount, 0),
      };
    });

  const dateRangeLabel = startDate && endDate ? `${isoToShort(startDate)} – ${isoToShort(endDate)}` : '';

  const result = {
    source: filename,
    startDate,
    endDate,
    dateRangeLabel,
    weekRevenue: events.reduce((s, e) => s + e.balanceDue, 0),
    totalEvents: events.length,
    totalGuests: events.reduce((s, e) => s + e.guestCount, 0),
    events,
    days,
  };
  if (warning) {
    result.warning = warning;
    // A short text sample + counts make a non-parsing export diagnosable from
    // the UI without needing the file itself.
    result.sampleText = collapse(fullText).slice(0, 600);
    result.totalPages = diag.totalPages ?? 0;
    result.fragments = diag.fragments ?? 0;
  }
  return result;
}

export async function parseCatering(input, filename = 'invoices.pdf') {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  let text = '';
  let totalPages = 0;
  let fragments = 0;
  try {
    ({ text, totalPages, fragments } = await extractText(buffer));
  } catch (e) {
    // Extraction itself failed (corrupt/encrypted/non-PDF). Surface a clear,
    // valid result rather than letting the route 500 with an opaque message.
    return buildResult(filename, '', [], `Could not read the PDF: ${e.message || 'unknown error'}`);
  }

  const diag = { totalPages, fragments };

  if (!text.trim()) {
    const why =
      fragments === 0
        ? `no text fragments across ${totalPages} page(s) — the export is likely scanned/flattened images, or uses a font with no Unicode mapping`
        : `${fragments} text fragment(s) found across ${totalPages} page(s) but none yielded readable characters`;
    return buildResult(filename, '', [], `No selectable text in the PDF: ${why}.`, diag);
  }

  const events = eventsFromText(text);
  if (!events.length) {
    return buildResult(
      filename,
      text,
      [],
      `Read ${totalPages} page(s) but found no recognizable invoices — the export layout may differ from what the parser expects.`,
      diag
    );
  }

  return buildResult(filename, text, events);
}

// Split newline-structured text into invoices and parse each. Shared by the PDF
// and HTML entry points — the only thing that differs upstream is how we obtain
// the text. Keeps only chunks that produced a usable event (date/balance/#).
function eventsFromText(text) {
  return splitInvoices(text)
    .map((c) => parseInvoice(c.fieldText, c.title))
    .filter((e) => e.dateISO || e.balanceDue > 0 || e.invoiceNumber);
}

// ---------------------------------------------------------------------------
// HTML entry point — for the saved CaterTrax report web page
// ---------------------------------------------------------------------------

// CaterTrax's print-to-PDF rasterizes the page (no text layer), but the report
// *web page* has real text. Saving it as "Webpage, HTML Only" and uploading
// that lets us recover the data. We flatten the HTML to the same newline-
// structured text the PDF path produces, then reuse the exact same splitter and
// field parsers — so the invoice structure only has to be understood once.
//
// We don't depend on CaterTrax's specific tag structure: block-level elements
// and <br>/table rows become line breaks, everything else is stripped to text.
// That yields "Label: value" lines the existing parser already handles.
function htmlToText(html) {
  let s = String(html);
  // Drop non-content so it can't leak into the text.
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  // Line breaks at visual block boundaries so labels/values land on their own
  // lines (mirrors how the page renders).
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|table|thead|tbody|section|header|footer)>/gi, '\n');
  s = s.replace(/<\/(td|th)>/gi, ' \n');
  // cheerio strips the remaining tags and decodes entities (&amp; &nbsp; …).
  const $ = cheerioLoad(`<root>${s}</root>`);
  const raw = $('root').text();
  // Normalize: trim each line, collapse runs of blank lines.
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function parseCateringHtml(input, filename = 'invoices.html') {
  const html = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  const text = htmlToText(html);
  if (!text.trim()) {
    return buildResult(filename, '', [], 'No text found in the saved page — is this the CaterTrax report page saved as HTML?');
  }
  const events = eventsFromText(text);
  if (!events.length) {
    return buildResult(
      filename,
      text,
      [],
      'Read the saved page but found no recognizable invoices — the report layout may differ from what the parser expects.',
      {}
    );
  }
  return buildResult(filename, text, events);
}

