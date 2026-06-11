import { NextResponse } from 'next/server';
import { AUTH_COOKIE, COOKIE_MAX_AGE, computeToken, safeEqual } from '../../../../lib/site-auth';

// POST { password } — checks against SITE_PASSWORD and, on success, sets the
// httpOnly auth cookie (a hash, never the password) for 30 days.
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = body?.password;
    const expected = process.env.SITE_PASSWORD;

    if (!expected) {
      return NextResponse.json({ error: 'Password gate is not configured' }, { status: 503 });
    }
    if (typeof password !== 'string' || !safeEqual(password, expected)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = await computeToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
