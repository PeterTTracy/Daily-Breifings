import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Phase 0: the Supabase project hasn't been created yet. These env vars will be
// set in Vercel once it exists:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once both Supabase env vars are present. */
export const isSupabaseConfigured: boolean = Boolean(url && anonKey);

/**
 * Browser/anon Supabase client. Returns `null` until the project is configured,
 * so importing this never throws and the live dashboard keeps working.
 * Call sites should guard: `if (!supabase) { ... }`.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
      // Live ops data must never be served stale. Next.js caches `fetch` by
      // default in Server Components; force no-store so every render reflects
      // the current database state.
      global: {
        fetch: (input: any, init: any = {}) => fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  : null;

export default supabase;
