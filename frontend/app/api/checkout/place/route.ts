import { NextRequest, NextResponse } from 'next/server';
import { currentUser, cartIdFromCookies } from '@/lib/auth';
import { placeOrder } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: 'sign in to checkout' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const address = body?.shipping_address;
  if (!address || !address.street_address || !address.city || !address.country) {
    return NextResponse.json({ error: 'complete shipping address required' }, { status: 400 });
  }

  const { id: cartId } = cartIdFromCookies();

  try {
    const res = await placeOrder({
      cartId,
      userId: user.id,
      shippingAddress: address,
      paymentMethod: body?.payment_method || 'card',
      cardToken: body?.card_token || '',
      couponCode: body?.coupon_code || '',
      shippingOptionId: body?.shipping_option_id || 'standard',
    });
    return NextResponse.json({
      order_id: res.order_id,
      tracking_id: res.tracking_id,
      total: res.total,
      status: res.status,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'checkout failed' }, { status: 400 });
  }
}
