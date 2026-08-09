import type { Money } from './money';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: Money;
  categories: string[];
  picture: string;
  stock: number;
  sku: string;
  active: boolean;
}

export interface CartItem {
  product_id: string;
  quantity: number;
  unit_price?: Money;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
}

export interface ProductList {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface Coupon {
  code: string;
  description: string;
  type: string; // PERCENT | FIXED_AMOUNT
  value: number;
  min_subtotal_units: number;
  currency_code: string;
  expires_at: number;
  max_uses: number;
  active: boolean;
  created_at: number;
}

export interface CouponValidation {
  valid: boolean;
  reason: string;
  discount_units: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: Money;
}

export interface Order {
  id: string;
  user_id: string;
  user_email: string;
  items: OrderItem[];
  subtotal: Money;
  discount: Money;
  shipping: Money;
  total: Money;
  coupon_code: string;
  shipping_address: {
    street_address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  status: string;
  tracking_id: string;
  created_at: number;
}
