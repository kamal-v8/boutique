import { getProduct } from './api';
import { centsFromMoney, moneyFromCents } from './money';
import { validateCoupon } from './api';
import { getRawCart } from './cart';
import type { Product } from './types';

export interface CartLine {
  product: Product;
  quantity: number;
  line_total_cents: number;
}

export interface EnrichedCart {
  id: string;
  lines: CartLine[];
  subtotal_cents: number;
  coupon: { code: string; discount_cents: number; valid: boolean; reason: string } | null;
  total_cents: number;
}

/** Join the raw cart with the product catalog and apply an optional coupon. */
export async function enrichCart(cartId: string, userId: string | null, couponCode?: string | null): Promise<EnrichedCart> {
  const cart = await getRawCart(cartId, userId);
  const lines: CartLine[] = [];
  let subtotal = 0;
  for (const item of cart.items || []) {
    try {
      const p = await getProduct(item.product_id);
      const lineTotal = centsFromMoney(p.price) * item.quantity;
      lines.push({ product: p, quantity: item.quantity, line_total_cents: lineTotal });
      subtotal += lineTotal;
    } catch {
      // skip products that no longer exist
    }
  }
  let discount = 0;
  let coupon: EnrichedCart['coupon'] = null;
  if (couponCode) {
    const v = await validateCoupon(couponCode, subtotal);
    if (v.valid) discount = v.discount_units;
    coupon = { code: couponCode, discount_cents: discount, valid: v.valid, reason: v.reason };
  }
  return {
    id: cart.id,
    lines,
    subtotal_cents: subtotal,
    coupon,
    total_cents: subtotal - discount,
  };
}

export { moneyFromCents };
