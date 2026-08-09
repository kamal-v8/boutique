'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, moneyFromCents, centsFromMoney } from '@/lib/money';
import type { Product } from '@/lib/types';

interface FormState {
  id?: string;
  name: string;
  sku: string;
  description: string;
  priceDollars: string;
  stock: string;
  categories: string;
  picture: string;
  active: boolean;
}

const EMPTY: FormState = {
  name: '',
  sku: '',
  description: '',
  priceDollars: '',
  stock: '0',
  categories: '',
  picture: '',
  active: true,
};

export function AdminProducts({ products }: { products: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startCreate() {
    setEditing({ ...EMPTY });
    setError('');
  }
  function startEdit(p: Product) {
    setEditing({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      priceDollars: (centsFromMoney(p.price) / 100).toFixed(2),
      stock: String(p.stock),
      categories: (p.categories || []).join(', '),
      picture: p.picture,
      active: p.active,
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
      const product = {
        ...(editing.id ? { id: editing.id } : {}),
        name: editing.name.trim(),
        sku: editing.sku.trim(),
        description: editing.description.trim(),
        price: moneyFromCents(Math.max(0, Math.round(parseFloat(editing.priceDollars || '0') * 100))),
        stock: Math.max(0, parseInt(editing.stock || '0', 10) || 0),
        categories: editing.categories.split(',').map((s) => s.trim()).filter(Boolean),
        picture: editing.picture.trim(),
        active: editing.active,
      };
      const res = await fetch('/api/admin/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'failed to save product');
      setEditing(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'failed to save product');
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete ${p.name}?`)) return;
    const res = await fetch('/api/admin/product', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="label text-ink/60">{products.length} products</p>
        <button type="button" onClick={startCreate} className="btn-cta">New product</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left label text-ink/60">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">SKU</th>
              <th className="py-3 pr-4">Price</th>
              <th className="py-3 pr-4">Stock</th>
              <th className="py-3 pr-4">Active</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-ink/5">
                <td className="py-3 pr-4">{p.name}</td>
                <td className="py-3 pr-4 text-ink/60">{p.sku}</td>
                <td className="py-3 pr-4">{formatMoney(p.price)}</td>
                <td className="py-3 pr-4">{p.stock}</td>
                <td className="py-3 pr-4">{p.active ? '✓' : '—'}</td>
                <td className="py-3 flex gap-4 justify-end">
                  <button type="button" onClick={() => startEdit(p)} className="btn-ghost">Edit</button>
                  <button type="button" onClick={() => remove(p)} className="text-sm text-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form onSubmit={save} className="border border-ink/20 p-6 max-w-lg flex flex-col gap-4">
          <p className="label text-ink/60">{editing.id ? `Edit ${editing.name}` : 'New product'}</p>
          <label className="flex flex-col gap-1">
            <span className="label text-ink/60">Name</span>
            <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">SKU</span>
              <input className="input" value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Price ($)</span>
              <input className="input" type="number" min="0" step="0.01" value={editing.priceDollars} onChange={(e) => setEditing({ ...editing, priceDollars: e.target.value })} required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Stock</span>
              <input className="input" type="number" min="0" step="1" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink/60">Categories</span>
              <input className="input" placeholder="Apparel, New" value={editing.categories} onChange={(e) => setEditing({ ...editing, categories: e.target.value })} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="label text-ink/60">Description</span>
            <textarea className="input" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink/60">Picture URL</span>
            <input className="input" value={editing.picture} onChange={(e) => setEditing({ ...editing, picture: e.target.value })} />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <span className="label text-ink/60">Active (visible in store)</span>
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
