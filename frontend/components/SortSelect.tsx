'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function SortSelect({ value, category, query }: { value: string; category?: string; query?: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set('sort', e.target.value);
    next.delete('page');
    router.push(`/products?${next.toString()}`);
  }

  void category;
  void query;
  return (
    <select name="sort" defaultValue={value} onChange={onChange} className="input w-36">
      <option value="featured">Featured</option>
      <option value="price_asc">Price ↑</option>
      <option value="price_desc">Price ↓</option>
      <option value="newest">Newest</option>
    </select>
  );
}
