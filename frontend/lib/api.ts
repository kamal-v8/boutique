import { clients, call } from './grpc';
import { centsFromMoney } from './money';
import type { Product, ProductList, Cart, CouponValidation, Order } from './types';

export interface ListParams {
  category?: string;
  query?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export interface CheckoutInput {
  cartId: string;
  userId: string;
  shippingAddress: { street_address: string; city: string; state: string; country: string; zip_code: string };
  paymentMethod?: string;
  cardToken?: string;
  couponCode?: string;
  shippingOptionId?: string;
}

export async function listProducts(params: ListParams = {}): Promise<ProductList> {
  const c = clients();
  const res = await call<any, any>(c.product, 'ListProducts', {
    category: params.category || '',
    query: params.query || '',
    page: params.page || 1,
    page_size: params.pageSize || 12,
    sort: params.sort || 'featured',
  });
  return res as ProductList;
}

export async function getProduct(id: string): Promise<Product> {
  const c = clients();
  return call<any, any>(c.product, 'GetProduct', { id });
}

export async function listCategories(): Promise<{ name: string; product_count: number }[]> {
  const c = clients();
  const res = await call<any, any>(c.product, 'ListCategories', {});
  return res.categories || [];
}

export async function validateCoupon(code: string, subtotalCents: number): Promise<CouponValidation> {
  const c = clients();
  const res = await call<any, any>(c.promotion, 'ValidateCoupon', { code, subtotal_units: subtotalCents });
  return { valid: res.valid, reason: res.reason || '', discount_units: res.discount_units || 0 } as CouponValidation;
}

export async function placeOrder(input: CheckoutInput) {
  const c = clients();
  return call<any, any>(c.checkout, 'PlaceOrder', {
    user_id: input.userId,
    cart_id: input.cartId,
    shipping_address: input.shippingAddress,
    payment_method: input.paymentMethod || 'card',
    card_token: input.cardToken || '',
    coupon_code: input.couponCode || '',
    shipping_option_id: input.shippingOptionId || '',
  });
}

export async function listOrders(userId: string): Promise<Order[]> {
  const c = clients();
  const res = await call<any, any>(c.order, 'ListOrders', { user_id: userId, page: 1, page_size: 50 });
  return (res.orders as Order[]) || [];
}

export async function getOrder(id: string): Promise<Order | null> {
  const c = clients();
  try {
    return await call<any, any>(c.order, 'GetOrder', { id });
  } catch {
    return null;
  }
}
