import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clients, call } from '@/lib/grpc';
import { COOKIE_REFRESH } from '@/lib/auth';
import { setAuthCookies, clearAuthCookies } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const store = cookies();
  const token = store.get(COOKIE_REFRESH)?.value;
  if (!token) {
    return NextResponse.json({ error: 'no refresh token' }, { status: 401 });
  }
  try {
    const res = await call<any, any>(clients().user, 'Refresh', { refresh_token: token });
    const out = NextResponse.json({ user: res.user });
    setAuthCookies(out, res.access_token, res.refresh_token, res.user);
    return out;
  } catch {
    const out = NextResponse.json({ error: 'session expired' }, { status: 401 });
    clearAuthCookies(out);
    return out;
  }
}
