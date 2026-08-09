import Link from 'next/link';
import { ProductGrid } from '@/components/ProductCard';
import { SortSelect } from '@/components/SortSelect';
import { listProducts, listCategories } from '@/lib/api';

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const sp = (k: string) => (Array.isArray(searchParams[k]) ? (searchParams[k] as string[])[0] : searchParams[k]) || '';
  const category = sp('category');
  const query = sp('q') || sp('query');
  const sort = sp('sort') || 'featured';
  const page = parseInt(sp('page') || '1', 10);

  const [data, cats] = await Promise.all([
    listProducts({ category, query, sort, page, pageSize: 9 }).catch(() => ({ products: [], total: 0, page: 1, pages: 1 })),
    listCategories().catch(() => []),
  ]);

  return (
    <div className="px-6 md:px-10 py-12">
      <header className="mb-12">
        <p className="label text-ink/50 mb-4">Shop / {category || 'All'}</p>
        <h1 className="display" style={{ fontSize: 'clamp(2.5rem, 10vw, 9rem)' }}>
          {category || 'Everything'}
        </h1>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-12 border-t border-b border-ink/10 py-5">
        <Link
          href={`/products${query ? `?q=${encodeURIComponent(query)}` : ''}`}
          className={`label px-4 py-2 border ${!category ? 'bg-ink text-base border-ink' : 'border-ink/30'}`}
        >
          All
        </Link>
        {cats.map((c) => (
          <Link
            key={c.name}
            href={`/products?category=${encodeURIComponent(c.name)}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
            className={`label px-4 py-2 border ${category === c.name ? 'bg-ink text-base border-ink' : 'border-ink/30'}`}
          >
            {c.name}
          </Link>
        ))}

        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <form action="/products" method="get" className="flex items-center gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <input name="q" defaultValue={query} placeholder="Search" className="input w-40 md:w-56" />
            <button type="submit" className="label">Go</button>
          </form>
          {/* Sort */}
          <div className="flex items-center">
            <SortSelect value={sort} category={category} query={query} />
          </div>
        </div>
      </div>

      {data.products.length === 0 ? (
        <p className="py-24 text-center text-ink/60 label">No products found.</p>
      ) : (
        <ProductGrid products={data.products} />
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-16">
          {page > 1 && (
            <Link
              href={`/products?${new URLSearchParams({ ...(category ? { category } : {}), ...(query ? { q: query } : {}), sort, page: String(page - 1) }).toString()}`}
              className="btn-cta"
            >
              Prev
            </Link>
          )}
          <span className="label">Page {page} / {data.pages}</span>
          {page < data.pages && (
            <Link
              href={`/products?${new URLSearchParams({ ...(category ? { category } : {}), ...(query ? { q: query } : {}), sort, page: String(page + 1) }).toString()}`}
              className="btn-cta"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
