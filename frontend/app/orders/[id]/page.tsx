import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { getOrder } from '@/lib/api';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect('/account');

  const order = await getOrder(params.id).catch(() => null);
  if (!order) notFound();
  if (order.user_id !== user.id && user.role !== 'admin') notFound();

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <p className="label text-ink/40 mb-8">
        <Link href="/account/orders" className="hover:text-ink/70">Orders</Link> / #{order.id.slice(0, 8).toUpperCase()}
      </p>

      <header className="mb-10 flex flex-col gap-2">
        <h1 className="display text-4xl md:text-6xl">Order confirmed</h1>
        <p className="text-ink/60">
          {order.id} · {new Date((order.created_at || 0) * 1000).toLocaleDateString()}
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {order.tracking_id && (
          <div className="flex items-center gap-6 border border-ink/20 p-6 max-w-lg">
            <div className="flex-1">
              <p className="label text-ink/60 mb-1">Tracking</p>
              <p className="text-lg">{order.tracking_id}</p>
            </div>
            <p className="label capitalize text-ink/60">{order.status}</p>
          </div>
        )}

        <ul className="max-w-2xl flex flex-col divide-y divide-ink/10">
          {(order.items || []).map((item) => (
            <li key={item.product_id} className="flex justify-between gap-6 py-4">
              <span>{item.product_name} × {item.quantity}</span>
              <span>{formatMoney(item.unit_price)}</span>
            </li>
          ))}
        </ul>

        <div className="max-w-xs flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-ink/60">Subtotal</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {order.coupon_code && (
            <div className="flex justify-between">
              <span className="text-ink/60">Coupon {order.coupon_code}</span>
              <span>−{formatMoney(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-ink/60">Shipping</span>
            <span>{formatMoney(order.shipping)}</span>
          </div>
          <div className="flex justify-between text-lg border-t border-ink/10 pt-3">
            <span>Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>

        {order.shipping_address && (
          <div className="max-w-xs">
            <p className="label text-ink/60 mb-2">Shipped to</p>
            <p className="text-ink/70">
              {order.shipping_address.street_address}, {order.shipping_address.city}, {order.shipping_address.state}{' '}
              {order.shipping_address.zip_code}, {order.shipping_address.country}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
