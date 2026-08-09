import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { clients, call } from './grpc';
import type { User } from './types';

export const COOKIE_ACCESS = 'boutique_access';
export const COOKIE_REFRESH = 'boutique_refresh';
export const COOKIE_UID = 'boutique_uid';
export const COOKIE_CART = 'boutique_cart';

export async function validateToken(accessToken: string): Promise<User | null> {
  try {
    const c = clients();
    const res = await call<any, any>(c.user, 'ValidateToken', { access_token: accessToken });
    if (!res?.valid) return null;
    return res.user as User;
  } catch {
    return null;
  }
}

/** Returns the current logged-in user by validating the cookie access token. */
export async function currentUser(): Promise<User | null> {
  const store = cookies();
  const token = store.get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  return validateToken(token);
}

/** Returns the current user only when they hold the admin role, else null. */
export async function requireAdmin(): Promise<User | null> {
  const user = await currentUser();
  if (!user || user.role !== 'admin') return null;
  return user;
}

export function cartIdFromCookies(): { id: string; userId: string | null } {
  const store = cookies();
  const uid = store.get(COOKIE_UID)?.value || null;
  const guest = store.get(COOKIE_CART)?.value || null;
  if (uid) return { id: uid, userId: uid };
  return { id: guest || 'anonymous', userId: null };
}

/** Returns the cart id to use, creating + persisting a guest cart cookie when needed. */
export function ensureCartId(): { id: string; userId: string | null } {
  const store = cookies();
  const uid = store.get(COOKIE_UID)?.value || null;
  if (uid) return { id: uid, userId: uid };
  let guest = store.get(COOKIE_CART)?.value;
  if (!guest) {
    guest = randomUUID();
    store.set(COOKIE_CART, guest, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  }
  return { id: guest, userId: null };
}
