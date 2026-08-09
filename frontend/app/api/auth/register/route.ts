import { NextRequest, NextResponse } from 'next/server';
import { clients, call } from '@/lib/grpc';
import { COOKIE_CART } from '@/lib/auth';
import { setAuthCookies, mergeGuestCartOnLogin } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');
  const name = String(body?.name || '').trim();
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password and name are required' }, { status: 400 });
  }
  try {
    const res = await call<any, any>(clients().user, 'Register', { email, password, name });
    const out = NextResponse.json({ user: res.user });
    await mergeGuestCartOnLogin(res.user.id, req.cookies.get(COOKIE_CART)?.value, out);
    setAuthCookies(out, res.access_token, res.refresh_token, res.user);
    return out;
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'registration failed' }, { status: 400 });
  }
}
