'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  async function add() {
    await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, quantity: 1 }),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="product-card group flex flex-col">
      <Link href={`/products/${product.id}`} className="block overflow-hidden bg-panel">
        <div className="product-image relative aspect-[3/4] w-full">
          <Image
            src={product.picture}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      </Link>
      <div className="pt-4 flex items-start justify-between gap-4">
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="product-title label font-bold text-ink">{product.name}</h3>
          </Link>
          <p className="text-sm text-[#444] mt-1">{formatMoney(product.price)}</p>
        </div>
        <button
          onClick={add}
          className="shrink-0 text-[11px] uppercase tracking-widest border border-ink/30 px-3 py-2 hover:bg-ink hover:text-base transition-colors"
        >
          {added ? 'Added' : 'Add'}
        </button>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-16">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
