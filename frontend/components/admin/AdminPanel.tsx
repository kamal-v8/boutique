'use client';

import { useState } from 'react';
import { AdminProducts } from './AdminProducts';
import { AdminOrders } from './AdminOrders';
import { AdminCoupons } from './AdminCoupons';
import type { Product, Order, Coupon } from '@/lib/types';

const TABS = ['products', 'orders', 'coupons'] as const;
type Tab = (typeof TABS)[number];

export function AdminPanel({ products, orders, coupons }: { products: Product[]; orders: Order[]; coupons: Coupon[] }) {
  const [tab, setTab] = useState<Tab>('products');

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <header className="mb-10">
        <p className="label text-ink/60 mb-4">Admin</p>
        <h1 className="display text-4xl md:text-6xl">Store admin</h1>
      </header>

      <div className="flex gap-6 mb-10">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`label capitalize ${tab === t ? 'text-ink' : 'text-ink/40 hover:text-ink/70'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'products' && <AdminProducts products={products} />}
      {tab === 'orders' && <AdminOrders orders={orders} />}
      {tab === 'coupons' && <AdminCoupons coupons={coupons} />}
    </main>
  );
}
