import { NextResponse } from 'next/server';
import { ensureCartId } from '@/lib/auth';
import { getRawCart } from '@/lib/cart';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { id, userId } = ensureCartId();
  const cart = await getRawCart(id, userId);
  const count = (cart.items || []).reduce((n, i) => n + (i.quantity || 0), 0);
  return NextResponse.json({ count });
}
