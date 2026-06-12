import { NextResponse } from 'next/server';
import { parseCatering } from '../../../lib/catering-parser';

// pdf-parse needs the Node runtime (Buffer + the pdfjs internals), and the
// upload is request-driven, so never statically optimize this route.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STORE_KEY = 'catering';

async function getStore() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    return {
      get: async (key) => kv.get(key),
      set: async (key, val) => kv.set(key, val),
    };
  }
  return null;
}

// GET — latest parsed catering report as { current, previous, uploadedAt }.
// Returns nulls (not an error) when nothing has been uploaded yet so the panel
// can render its sample state.
export async function GET() {
  try {
    const store = await getStore();
    if (store) {
      const data = await store.get(STORE_KEY);
      if (data) return NextResponse.json(data);
    }
    return NextResponse.json({ current: null, previous: null, uploadedAt: null });
  } catch (e) {
    return NextResponse.json({ current: null, previous: null, uploadedAt: null });
  }
}

// POST — multipart upload of the CaterTrax "Invoice Report" PDF. Parses to the
// per-event summary JSON and stores it in KV, rotating the existing week into
// `previous` so the dashboard could show week-over-week movement.
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'No file uploaded. Send the PDF as multipart form field "file".' },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await parseCatering(buf, file.name || 'invoices.pdf');
    const uploadedAt = Date.now();
    parsed.uploadedAt = uploadedAt;

    // parseCatering never throws for "couldn't make sense of it" — it returns a
    // valid result carrying a `warning` and zero events. Don't let such a parse
    // overwrite a previously-good upload; just hand it back so the panel can
    // explain what happened.
    const ok = parsed.totalEvents > 0;

    const store = await getStore();
    if (!store) {
      // No KV configured (local dev without env vars): return the parse so the
      // client can show it this session, but it won't persist.
      return NextResponse.json({
        ok,
        current: parsed,
        previous: null,
        uploadedAt,
        note: 'No storage configured — not persisted.',
      });
    }

    if (!ok) {
      // Keep the existing stored week intact; surface the new (empty) parse only.
      const existing = await store.get(STORE_KEY);
      return NextResponse.json({ ok, current: parsed, previous: existing?.current || null, uploadedAt });
    }

    const existing = await store.get(STORE_KEY);
    const previous = existing?.current || null;
    const record = { current: parsed, previous, uploadedAt };
    await store.set(STORE_KEY, record);
    return NextResponse.json({ ok, ...record });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to parse upload' }, { status: 500 });
  }
}
