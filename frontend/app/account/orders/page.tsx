import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listOrders } from '@/lib/api';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) redirect('/account');

  const orders = await listOrders(user.id).catch(() => []);

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <header className="mb-10">
        <p className="label text-ink/60 mb-4">Orders</p>
        <h1 className="display text-4xl md:text-6xl">Your orders</h1>
      </header>

      {orders.length === 0 ? (
        <p className="text-ink/60">No orders yet — <Link href="/products" className="text-accent underline">start shopping</Link>.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ink/10 max-w-3xl">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between py-6 group">
                <div>
                  <p className="text-sm text-ink/50">{new Date((o.created_at || 0) * 1000).toLocaleDateString()}</p>
                  <p className="mt-1 group-hover:underline">
                    #{o.id.slice(0, 8).toUpperCase()} · {(o.items || []).length} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg">{formatMoney(o.total)}</p>
                  <p className="text-sm capitalize text-ink/60">{o.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
