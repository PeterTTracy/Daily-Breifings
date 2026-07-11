// Authorization for the data-upload POST endpoints (/api/financials,
// /api/catering, /api/meal-clicks) and shared upload-body reading.
//
// Two callers hit these endpoints:
//   1. The browser panels — authenticated by the site-password cookie.
//   2. Scheduled Claude/Cowork tasks — no cookie; they authenticate with the
//      same `x-api-key` header the briefing POST has always used.
// The proxy lets these POSTs through to the route (like POST /api/briefing),
// so the route itself must accept EITHER credential.

import { AUTH_COOKIE, isGateConfigured, isValidToken, safeEqual } from './site-auth';

/** True when the request carries a valid x-api-key or a valid site cookie.
 *  Fails OPEN when neither the API key nor the password gate is configured,
 *  matching the site-wide behavior before env vars are set. */
export async function isAuthorizedUpload(req) {
  const configuredKey = process.env.BRIEFING_API_KEY || '';
  const sentKey = req.headers.get('x-api-key') || '';
  if (configuredKey && safeEqual(sentKey, configuredKey)) return true;

  if (!isGateConfigured()) return true;

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return isValidToken(token);
}

/**
 * Read the uploaded file from the request, tolerating both transports:
 *   - multipart/form-data with the file in field "file" (the browser panels)
 *   - a raw request body (curl --data-binary @file) with the filename taken
 *     from an `x-filename` header or a `?filename=` query param
 * Returns { buf, name } or null when there's no usable body.
 */
export async function readUpload(req, fallbackName) {
  const contentType = req.headers.get('content-type') || '';

  if (/multipart\/form-data/i.test(contentType)) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return null;
    return { buf: Buffer.from(await file.arrayBuffer()), name: file.name || fallbackName };
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return null;
  const name =
    req.headers.get('x-filename') ||
    new URL(req.url).searchParams.get('filename') ||
    fallbackName;
  return { buf, name };
}
