import { NextResponse } from 'next/server';

const FLAG_KEY = 'refresh_requested';

async function getStore() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    return {
      get: async (key) => kv.get(key),
      set: async (key, val) => kv.set(key, val),
      del: async (key) => kv.del(key),
    };
  }
  return null;
}

// POST — called by the dashboard UI "Request refresh" button. No API key
// required (the button is on the public page). Sets a flag that the Claude
// polling task picks up on its next cycle (~every 15 min).
export async function POST() {
  try {
    const store = await getStore();
    if (!store) return NextResponse.json({ error: 'No storage configured' }, { status: 500 });

    await store.set(FLAG_KEY, { requestedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, note: 'Refresh requested. New data within ~15 minutes.' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET — called by the Claude polling task (requires API key). Returns the
// current flag, or { requested: false }.
export async function GET(req) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.BRIEFING_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStore();
    if (!store) return NextResponse.json({ error: 'No storage configured' }, { status: 500 });

    const flag = await store.get(FLAG_KEY);
    return NextResponse.json(flag ? { requested: true, ...flag } : { requested: false });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — called by the Claude polling task after handling a refresh
// (requires API key). Clears the flag.
export async function DELETE(req) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.BRIEFING_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = await getStore();
    if (!store) return NextResponse.json({ error: 'No storage configured' }, { status: 500 });

    await store.del(FLAG_KEY);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
