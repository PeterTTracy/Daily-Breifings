import { NextResponse } from 'next/server';

// Phase 0 auth gate — PASS-THROUGH for now.
//
// It is intentionally not enforcing yet: there is no real IdP (Azure AD) and no
// sign-in UI, so enforcing would lock real users out of the live dashboard.
//
// When Entra SSO is ready, enforce here. The simplest path is to replace this
// file's body with next-auth's middleware:
//
//   export { default } from 'next-auth/middleware';
//
// ...and keep the matcher below so API routes are never gated (the scheduled
// task POSTs to /api/briefing every 30 minutes and must not be blocked).
export function middleware() {
  return NextResponse.next();
}

export const config = {
  // Run on app pages only — never on /api/*, Next internals, or static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon-).*)'],
};
