import { clients, call } from './grpc';
import type { Cart } from './types';

export async function getRawCart(cartId: string, userId: string | null): Promise<Cart> {
  const c = clients();
  return call<any, any>(c.cart, 'GetCart', { cart_id: cartId, user_id: userId || '' });
}

export async function addToCart(cartId: string, userId: string | null, productId: string, quantity = 1): Promise<Cart> {
  const c = clients();
  return call<any, any>(c.cart, 'AddItem', { cart_id: cartId, user_id: userId || '', product_id: productId, quantity });
}

export async function updateCartItem(cartId: string, userId: string | null, productId: string, quantity: number): Promise<Cart> {
  const c = clients();
  return call<any, any>(c.cart, 'UpdateItem', { cart_id: cartId, user_id: userId || '', product_id: productId, quantity });
}

export async function removeCartItem(cartId: string, userId: string | null, productId: string): Promise<Cart> {
  const c = clients();
  return call<any, any>(c.cart, 'RemoveItem', { cart_id: cartId, user_id: userId || '', product_id: productId });
}

export async function mergeGuestCart(guestCartId: string, userId: string): Promise<Cart> {
  const c = clients();
  return call<any, any>(c.cart, 'MergeCarts', { guest_cart_id: guestCartId, user_id: userId });
}
