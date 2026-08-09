import { NextRequest, NextResponse } from 'next/server';
import { ensureCartId } from '@/lib/auth';
import { removeCartItem } from '@/lib/cart';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId = body?.product_id;
  if (!productId || typeof productId !== 'string') {
    return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
  }
  const { id, userId } = ensureCartId();
  const cart = await removeCartItem(id, userId, productId);
  const count = (cart.items || []).reduce((n, i) => n + (i.quantity || 0), 0);
  return NextResponse.json({ count });
}
