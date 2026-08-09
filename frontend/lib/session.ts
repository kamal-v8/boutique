import { NextResponse } from 'next/server';
import { COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_UID, COOKIE_CART } from './auth';
import { mergeGuestCart } from './cart';
import type { User } from './types';

export const ACCESS_MAXAGE = 60 * 60;
export const REFRESH_MAXAGE = 60 * 60 * 24 * 30;

export function setAuthCookies(res: NextResponse, access: string, refresh: string, user: User) {
  res.cookies.set(COOKIE_ACCESS, access, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: ACCESS_MAXAGE });
  res.cookies.set(COOKIE_REFRESH, refresh, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: REFRESH_MAXAGE });
  res.cookies.set(COOKIE_UID, user.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: REFRESH_MAXAGE });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(COOKIE_ACCESS, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  res.cookies.set(COOKIE_UID, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

/** After a successful login, fold the guest cart into the user's cart and drop the guest cookie. */
export async function mergeGuestCartOnLogin(userId: string, guestCartId: string | null | undefined, res?: NextResponse) {
  if (guestCartId && guestCartId !== userId) {
    await mergeGuestCart(guestCartId, userId);
  }
  if (res) {
    res.cookies.set(COOKIE_CART, '', { path: '/', maxAge: 0 });
  }
}
