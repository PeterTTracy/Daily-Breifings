// Shared helpers for the site-password gate.
// Uses the Web Crypto API (crypto.subtle) so the SAME code runs in both the
// Edge middleware and Node route handlers. No Node-only `crypto` import.

export const AUTH_COOKIE = 'auth-token';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

/** The gate is active only once SITE_PASSWORD is set (fail OPEN until then). */
export function isGateConfigured() {
  return Boolean(process.env.SITE_PASSWORD);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deterministic cookie token = SHA-256( SITE_PASSWORD :: AUTH_SECRET ).
 * Stored in the cookie instead of the password; verifiable server-side.
 */
export async function computeToken() {
  const password = process.env.SITE_PASSWORD || '';
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'change-me';
  const data = new TextEncoder().encode(`${password}::${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

/** Constant-time string comparison (avoids leaking via timing). */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Validate a cookie token against the expected hash. */
export async function isValidToken(token) {
  if (!token || !isGateConfigured()) return false;
  const expected = await computeToken();
  return safeEqual(token, expected);
}
