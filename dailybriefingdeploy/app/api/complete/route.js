import { NextResponse } from 'next/server';

const STORE_KEY = 'briefing_current';

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

export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const store = await getStore();
    if (!store) return NextResponse.json({ ok: true, note: 'no storage — toggle is client-side only' });

    const data = await store.get(STORE_KEY);
    if (!data?.items) return NextResponse.json({ ok: true });

    data.items = data.items.map(i => i.id === id ? { ...i, completed: !i.completed } : i);
    await store.set(STORE_KEY, data);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
