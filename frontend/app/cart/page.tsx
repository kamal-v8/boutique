import Link from 'next/link';
import { cartIdFromCookies } from '@/lib/auth';
import { enrichCart } from '@/lib/enrich';
import { formatMoney, moneyFromCents } from '@/lib/money';
import { CartLineControls } from '@/components/CartLineControls';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const { id, userId } = cartIdFromCookies();
  const cart = await enrichCart(id, userId).catch(() => null);

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <header className="mb-10">
        <p className="label text-ink/60 mb-4">Cart</p>
        <h1 className="display text-4xl md:text-6xl">Your cart</h1>
      </header>

      {!cart || cart.lines.length === 0 ? (
        <p className="text-ink/60">
          Your cart is empty — <Link href="/products" className="text-accent underline">start shopping</Link>.
        </p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          <ul className="flex-1 flex flex-col divide-y divide-ink/10">
            {cart.lines.map((line) => (
              <li key={line.product.id} className="flex items-center gap-6 py-6">
                <img src={line.product.picture} alt={line.product.name} className="w-24 h-32 object-cover" />
                <div className="flex-1">
                  <p className="font-medium">{line.product.name}</p>
                  <p className="text-sm text-ink/60">{formatMoney(line.product.price)}</p>
                  <CartLineControls productId={line.product.id} quantity={line.quantity} />
                </div>
                <p className="text-lg">{formatMoney(moneyFromCents(line.line_total_cents))}</p>
              </li>
            ))}
          </ul>

          <aside className="w-full lg:w-80 flex flex-col gap-4">
            <h2 className="display text-2xl">Summary</h2>
            <div className="flex justify-between">
              <span className="text-ink/60">Subtotal</span>
              <span>{formatMoney(moneyFromCents(cart.subtotal_cents))}</span>
            </div>
            {cart.coupon && (
              <div className="flex justify-between">
                <span className="text-ink/60">Coupon {cart.coupon.code}</span>
                <span>−{formatMoney(moneyFromCents(cart.coupon.discount_cents))}</span>
              </div>
            )}
            <div className="flex justify-between text-lg border-t border-ink/10 pt-4">
              <span>Total</span>
              <span>{formatMoney(moneyFromCents(cart.total_cents))}</span>
            </div>
            <Link href="/checkout" className="btn-cta justify-center">Checkout</Link>
            <Link href="/products" className="btn-ghost justify-center">Continue shopping</Link>
          </aside>
        </div>
      )}
    </main>
  );
}
