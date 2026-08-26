'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifyCartChanged } from '@/lib/cart-events';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      notifyCartChanged();
      router.push('/account');
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={onLogout} className="btn-ghost" disabled={busy}>
      {busy ? '…' : 'Sign out'}
    </button>
  );
}
