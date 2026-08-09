'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CartLineControls({ productId, quantity }: { productId: string; quantity: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setQty(q: number) {
    if (busy) return;
    setBusy(true);
    try {
      const url = q <= 0 ? '/api/cart/remove' : '/api/cart/update';
      const body = q <= 0 ? { product_id: productId } : { product_id: productId, quantity: q };
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex items-center gap-4">
      <div className="flex items-center border border-ink/20">
        <button type="button" onClick={() => setQty(quantity - 1)} className="px-3 py-1 hover:bg-ink/5" disabled={busy} aria-label="Decrease quantity">
          −
        </button>
        <span className="px-3 py-1 min-w-[2rem] text-center text-sm">{quantity}</span>
        <button type="button" onClick={() => setQty(quantity + 1)} className="px-3 py-1 hover:bg-ink/5" disabled={busy} aria-label="Increase quantity">
          +
        </button>
      </div>
      <button type="button" onClick={() => setQty(0)} className="text-sm text-ink/50 hover:text-red-600" disabled={busy}>
        Remove
      </button>
    </div>
  );
}
