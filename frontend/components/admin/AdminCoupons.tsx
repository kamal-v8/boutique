'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, moneyFromCents } from '@/lib/money';
import type { Coupon } from '@/lib/types';

interface FormState {
  code: string;
  description: string;
  type: string;
  value: string;
  minSubtotalDollars: string;
  maxUses: string;
  active: boolean;
}

const EMPTY: FormState = {
  code: '',
  description: '',
  type: 'PERCENT',
  value: '',
  minSubtotalDollars: '0',
  maxUses: '0',
  active: true,
};

export function AdminCoupons({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startCreate() {
    setEditing({ ...EMPTY });
    setError('');
  }
  function startEdit(c: Coupon) {
    setEditing({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: String(c.value ?? 0),
      minSubtotalDollars: ((c.min_subtotal_units || 0) / 100).toFixed(2),
      maxUses: String(c.max_uses ?? 0),
      active: c.active,
    });
    setError('');
  }
  function cancel() {
    setEditing(null);
    setError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      const coupon = {
        code: editing.code.trim().toUpperCase(),
        description: editing.description.trim(),
        type: editing.type,
        value: Math.max(0, parseInt(editing.value || '0', 10) || 0),
        min_subtotal_units: Math.max(0, Math.round(parseFloat(editing.minSubtotalDollars || '0') * 100)),
        currency_code: 'USD',
        max_uses: Math.max(0, parseInt(editing.maxUses || '0', 10) || 0),
        active: editing.active,
      };
      const res = await fetch('/api/admin/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed to save coupon');
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'failed to save coupon');
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    const res = await fetch('/api/admin/coupon', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: c.code }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="label text-ink/60">{coupons.length} coupons</p>
        <button type="button" onClick={startCreate} className="btn-cta">New coupon</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left label text-ink/60">
              <th className="py-3 pr-4">Code</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Value</th>
              <th className="py-3 pr-4">Min order</th>
              <th className="py-3 pr-4">Uses</th>
              <th className="py-3 pr-4">Active</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.code} className="border-b border-ink/5">
                <td className="py-3 pr-4 font-medium">{c.code}</td>
                <td className="py-3 pr-4 text-ink/60">{c.type}</td>
                <td className="py-3 pr-4">
                  {c.type === 'PERCENT' ? `${c.value}%` : formatMoney(moneyFromCents(c.value || 0))}
                </td>
                <td className="py-3 pr-4">{formatMoney(moneyFromCents(c.min_subtotal_units || 0))}</td>
                <td className="py-3 pr-4">{c.max_uses || '∞'}</td>
                <td className="py-3 pr-4">{c.active ? '✓' : '—'}</td>
                <td className="py-3 flex gap-4 justify-end">
                  <button type="button" onClick={() => startEdit(c)} className="btn-ghost">Edit</button>
                  <button type="button" onClick={() => remove(c)} className="text-sm text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form onSubmit={save} className="border border-ink/20 p-6 max-w-lg flex flex-col gap-4">
          <p className="label text-ink/60">{editing.code ? `Edit ${editing.code}` : 'New coupon'}</p>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Code</span>
              <input className="input" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Type</span>
              <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">{editing.type === 'PERCENT' ? 'Percent off' : 'Amount off ($)'}</span>
              <input className="input" type="number" min="0" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Min order ($)</span>
              <input className="input" type="number" min="0" step="0.01" value={editing.minSubtotalDollars} onChange={(e) => setEditing({ ...editing, minSubtotalDollars: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Max uses (0 = unlimited)</span>
              <input className="input" type="number" min="0" value={editing.maxUses} onChange={(e) => setEditing({ ...editing, maxUses: e.target.value })} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="label text-ink/60">Description</span>
            <input className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span className="label text-ink/60">Active</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-6">
            <button type="submit" className="btn-cta" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={cancel} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
