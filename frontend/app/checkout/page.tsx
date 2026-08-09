import { redirect } from 'next/navigation';
import { currentUser, cartIdFromCookies } from '@/lib/auth';
import { enrichCart } from '@/lib/enrich';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { CheckoutForm } from '@/components/CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const user = await currentUser();
  if (!user) redirect('/account?next=/checkout');

  const { id, userId } = cartIdFromCookies();
  const cart = await enrichCart(id, userId).catch(() => null);
  if (!cart || cart.lines.length === 0) redirect('/cart');

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <header className="mb-10">
        <p className="label text-ink/60 mb-4">Checkout</p>
        <h1 className="display text-4xl md:text-6xl">Checkout</h1>
      </header>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        <div className="flex-1">
          <CheckoutForm subtotalUnits={cart.subtotal_cents} />
        </div>

        <aside className="w-full lg:w-96 flex flex-col gap-3">
          <h2 className="display text-2xl mb-2">Order summary</h2>
          {cart.lines.map((l) => (
            <div key={l.product.id} className="flex justify-between gap-6 text-sm">
              <span className="truncate">{l.product.name} × {l.quantity}</span>
              <span className="shrink-0">{formatMoney(moneyFromCents(l.line_total_cents))}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-ink/10 pt-3 mt-2">
            <span className="text-ink/60">Subtotal</span>
            <span>{formatMoney(moneyFromCents(cart.subtotal_cents))}</span>
          </div>
          {cart.coupon && (
            <div className="flex justify-between text-sm">
              <span className="text-ink/60">Coupon {cart.coupon.code}</span>
              <span>−{formatMoney(moneyFromCents(cart.coupon.discount_cents))}</span>
            </div>
          )}
          <p className="text-xs text-ink/50 mt-2">Signed in as {user.email}</p>
        </aside>
      </div>
    </main>
  );
}
