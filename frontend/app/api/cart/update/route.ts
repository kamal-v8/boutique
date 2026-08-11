import { NextRequest, NextResponse } from 'next/server';
import { ensureCartId } from '@/lib/auth';
import { updateCartItem } from '@/lib/cart';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId = body?.product_id;
  const quantity = Number(body?.quantity);
  if (!productId || typeof productId !== 'string' || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'product_id and a positive integer quantity are required' }, { status: 400 });
  }
  const { id, userId } = await ensureCartId();
  const cart = await updateCartItem(id, userId, productId, quantity);
  const count = (cart.items || []).reduce((n, i) => n + (i.quantity || 0), 0);
  return NextResponse.json({ count });
}
