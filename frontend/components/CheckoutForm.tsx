'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, moneyFromCents } from '@/lib/money';

const SHIPPING_OPTIONS = [
  { id: 'standard', name: 'Standard — 5 days' },
  { id: 'express', name: 'Express — 2 days' },
  { id: 'overnight', name: 'Overnight — 1 day' },
];

export function CheckoutForm({ subtotalUnits }: { subtotalUnits: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState<{ valid: boolean; discount_units: number; reason: string } | null>(null);
  const [shippingOptionId, setShippingOptionId] = useState('standard');
  const [address, setAddress] = useState({ street_address: '', city: '', state: '', country: '', zip_code: '' });

  function setField(k: keyof typeof address, v: string) {
    setAddress((a) => ({ ...a, [k]: v }));
  }

  async function applyCoupon() {
    setCouponInfo(null);
    if (!couponCode.trim()) return;
    const res = await fetch('/api/promotion/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode.trim(), subtotal_units: subtotalUnits }),
    }).catch(() => null);
    if (res) {
      const data = await res.json().catch(() => null);
      if (data) setCouponInfo(data);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/checkout/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: address,
          payment_method: 'card',
          card_token: 'tok_visa',
          coupon_code: couponCode.trim(),
          shipping_option_id: shippingOptionId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'checkout failed');
      router.push(`/orders/${data.order_id}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'checkout failed');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 max-w-lg">
      <fieldset className="flex flex-col gap-4">
        <legend className="label text-ink/60 mb-2">Shipping address</legend>
        {(
          [
            ['street_address', 'Street address'],
            ['city', 'City'],
            ['state', 'State'],
            ['country', 'Country'],
            ['zip_code', 'ZIP code'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex flex-col gap-2">
            <span className="label text-ink/60">{label}</span>
            <input className="input" value={address[key]} onChange={(e) => setField(key, e.target.value)} required={key !== 'state' && key !== 'zip_code'} />
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="label text-ink/60 mb-2">Shipping method</legend>
        <select className="input" value={shippingOptionId} onChange={(e) => setShippingOptionId(e.target.value)}>
          {SHIPPING_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="label text-ink/60 mb-2">Payment</legend>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3">
            <input type="radio" name="payment" checked readOnly className="accent-[var(--accent)]" />
            <span>Card <span className="text-sm text-ink/50">(demo — no real charge)</span></span>
          </label>
          <p className="text-sm text-ink/50">Number 4242 4242 4242 4242 · expiry 12/29 · CVC 123</p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="label text-ink/60 mb-2">Coupon</legend>
        <div className="flex items-center gap-3">
          <input className="input" placeholder="e.g. WELCOME10" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
          <button type="button" onClick={applyCoupon} className="btn-ghost shrink-0">Apply</button>
        </div>
        {couponInfo && (
          <p className={`text-sm ${couponInfo.valid ? 'text-green-700' : 'text-red-600'}`}>
            {couponInfo.valid
              ? `Applied — saves ${formatMoney(moneyFromCents(couponInfo.discount_units))}`
              : couponInfo.reason || 'Coupon not valid'}
          </p>
        )}
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-cta self-start" disabled={busy}>
        {busy ? 'Placing…' : 'Place order'}
      </button>
    </form>
  );
}
