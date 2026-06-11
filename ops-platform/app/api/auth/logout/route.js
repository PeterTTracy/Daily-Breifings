import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '../../../../lib/site-auth';

// POST — clears the auth cookie.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
