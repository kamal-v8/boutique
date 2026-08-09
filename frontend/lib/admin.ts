import { clients, call } from './grpc';
import { moneyFromCents } from './money';
import type { Product, Order, Coupon } from './types';

function normalizeProduct(p: Partial<Product>): any {
  return {
    ...p,
    price: p.price || moneyFromCents(0),
    categories: p.categories || [],
    stock: p.stock ?? 0,
    active: p.active ?? true,
  };
}

export async function createProduct(p: Partial<Product>): Promise<Product> {
  const c = clients();
  return call<any, any>(c.product, 'CreateProduct', { product: normalizeProduct(p) });
}
export async function updateProduct(p: Partial<Product>): Promise<Product> {
  const c = clients();
  return call<any, any>(c.product, 'UpdateProduct', { product: normalizeProduct(p) });
}
export async function deleteProduct(id: string): Promise<void> {
  const c = clients();
  return call<any, any>(c.product, 'DeleteProduct', { id });
}

export async function allOrders(): Promise<Order[]> {
  const c = clients();
  const res = await call<any, any>(c.order, 'GetAllOrders', { page: 1, page_size: 100 });
  return (res.orders as Order[]) || [];
}
export async function updateOrderStatus(id: string, status: string): Promise<Order> {
  const c = clients();
  return call<any, any>(c.order, 'UpdateOrderStatus', { id, status });
}

export async function listCoupons(): Promise<Coupon[]> {
  const c = clients();
  const res = await call<any, any>(c.promotion, 'ListCoupons', { page: 1, page_size: 100 });
  return (res.coupons as Coupon[]) || [];
}
export async function upsertCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
  const c = clients();
  return call<any, any>(c.promotion, 'CreateCoupon', { coupon });
}
export async function deleteCoupon(code: string): Promise<void> {
  const c = clients();
  return call<any, any>(c.promotion, 'DeleteCoupon', { code });
}
