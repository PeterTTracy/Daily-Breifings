import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client. Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// (service role — bypasses RLS, so never import this into client code). Returns
// null when the env vars aren't set so callers can degrade gracefully to a
// "not configured" state instead of throwing at build/request time.
let cached = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
