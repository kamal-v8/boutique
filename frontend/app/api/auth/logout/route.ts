import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clients, call } from '@/lib/grpc';
import { COOKIE_REFRESH } from '@/lib/auth';
import { clearAuthCookies } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const store = await cookies();
  const token = store.get(COOKIE_REFRESH)?.value;
  if (token) {
    try {
      await call<any, any>(clients().user, 'Logout', { refresh_token: token });
    } catch {
      // token may already be revoked — still clear local cookies
    }
  }
  const out = NextResponse.json({ ok: true });
  clearAuthCookies(out);
  return out;
}
