'use client';

import Link from 'next/link';
import { Search, ShoppingBag, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CART_CHANGED } from '@/lib/cart-events';

export function Nav() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    fetch('/api/cart/count', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCount(d.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CART_CHANGED, refresh);
    return () => window.removeEventListener(CART_CHANGED, refresh);
  }, [refresh]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-base/80 backdrop-blur mix-blend-difference md:mix-blend-normal">
      <nav className="mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        <Link href="/" className="display text-2xl tracking-tighter text-base md:text-ink">
          BOUTIQUE
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/products" className="label nav-link text-base">Shop</Link>
          <Link href="/products?category=Footwear" className="label nav-link text-base">Footwear</Link>
          <Link href="/products?category=Apparel" className="label nav-link text-base">Apparel</Link>
          <Link href="/products?category=Accessories" className="label nav-link text-base">Accessories</Link>
          <Link href="/account/orders" className="label nav-link text-base">Orders</Link>
        </div>

        <div className="flex items-center gap-5 text-base md:text-ink">
          <Link href="/products" aria-label="Search">
            <Search size={20} />
          </Link>
          <Link href="/account" aria-label="Account" className="hidden md:inline">
            <User size={20} />
          </Link>
          <Link href="/cart" aria-label="Cart" className="relative">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {count}
              </span>
            )}
          </Link>
          <button className="md:hidden text-base" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <span className="display text-xl">≡</span>
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden bg-base border-t border-ink/10 px-6 py-4 flex flex-col gap-4">
          <Link href="/products" className="label" onClick={() => setOpen(false)}>Shop</Link>
          <Link href="/account/orders" className="label" onClick={() => setOpen(false)}>Orders</Link>
          <Link href="/admin" className="label" onClick={() => setOpen(false)}>Admin</Link>
        </div>
      )}
    </header>
  );
}
