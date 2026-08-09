'use client';

import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import type { Order } from '@/lib/types';

const STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function AdminOrders({ orders }: { orders: Order[] }) {
  const router = useRouter();

  async function setStatus(order: Order, status: string) {
    const res = await fetch('/api/admin/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <p className="label text-ink/60">{orders.length} orders</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left label text-ink/60">
              <th className="py-3 pr-4">Order</th>
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Total</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-ink/5">
                <td className="py-3 pr-4">#{o.id.slice(0, 8).toUpperCase()}</td>
                <td className="py-3 pr-4 text-ink/60">{new Date((o.created_at || 0) * 1000).toLocaleDateString()}</td>
                <td className="py-3 pr-4 text-ink/60">{o.user_email || '—'}</td>
                <td className="py-3 pr-4">{formatMoney(o.total)}</td>
                <td className="py-3">
                  <select
                    className="input w-40 capitalize"
                    defaultValue={o.status}
                    onChange={(e) => setStatus(o, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="normal-case">{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
