import { NextResponse } from 'next/server';
import { parseMealClicks } from '../../../lib/meal-clicks-parser';

// xlsx parsing needs the Node runtime (Buffer/typed arrays), and the upload is
// request-driven, so never statically optimize this route.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STORE_KEY = 'meal_clicks';

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

// GET — latest parsed meal-clicks data, as { current, previous, uploadedAt }.
// Returns nulls (not an error) when nothing has been uploaded yet so the panel
// can render its empty/sample state.
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

// POST — multipart upload of the TechCash XLSX. Parses to summary JSON and
// stores it in KV, rotating the existing week into `previous` so the dashboard
// can show a week-over-week change.
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'No file uploaded. Send the XLSX as multipart form field "file".' },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const parsed = parseMealClicks(bytes, file.name || 'MPClicksByLocandDay.XLSX');
    const uploadedAt = Date.now();
    parsed.uploadedAt = uploadedAt;

    const store = await getStore();
    if (!store) {
      // No KV configured (local dev without env vars): return the parse so the
      // client can show it this session, but it won't persist.
      return NextResponse.json({
        ok: true,
        current: parsed,
        previous: null,
        uploadedAt,
        note: 'No storage configured — not persisted.',
      });
    }

    const existing = await store.get(STORE_KEY);
    const previous = existing?.current || null;
    const record = { current: parsed, previous, uploadedAt };
    await store.set(STORE_KEY, record);
    return NextResponse.json({ ok: true, ...record });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to parse upload' }, { status: 500 });
  }
}
