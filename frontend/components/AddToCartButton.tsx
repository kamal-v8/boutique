'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifyCartChanged } from '@/lib/cart-events';

export function AddToCartButton({ productId, outOfStock }: { productId: string; outOfStock?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  async function add() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      if (!res.ok) throw new Error();
      setAdded(true);
      notifyCartChanged();
      router.refresh();
    } catch {
      // silently ignore — refresh will surface empty-state errors if any
    } finally {
      setBusy(false);
    }
  }

  if (outOfStock) {
    return <p className="text-ink/50">Out of stock</p>;
  }

  return (
    <button type="button" onClick={add} className="btn-cta self-start" disabled={busy}>
      {busy ? '…' : added ? 'Added ✓' : 'Add to cart'}
    </button>
  );
}
