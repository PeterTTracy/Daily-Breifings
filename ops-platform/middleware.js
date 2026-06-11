import { NextResponse } from 'next/server';
import { AUTH_COOKIE, isGateConfigured, isValidToken } from './lib/site-auth';

// Site-password gate. Runs on every request except static assets.
export async function middleware(request) {
  // Fail OPEN until SITE_PASSWORD is configured in Vercel — deploying this must
  // never lock everyone out of the live site before the env vars are set.
  if (!isGateConfigured()) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Always allowed, even without a cookie:
  //  - the login page itself
  //  - the auth endpoints (login/logout + NextAuth)
  const isLogin = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth/');
  if (isLogin || isAuthApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }

  // Unauthenticated: APIs get 401 JSON, pages redirect to /login.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname && pathname !== '/' ? `?from=${encodeURIComponent(pathname)}` : '';
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything EXCEPT static assets — /api/* is gated too. Static/PWA
  // assets stay open
  // so the login page and the installable app can load without auth.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-|apple-touch-icon).*)'],
};
