import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Blobs } from '@/components/Blobs';
import { ProductGrid } from '@/components/ProductCard';
import { listProducts, listCategories } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const featured = await listProducts({ pageSize: 6, sort: 'featured' }).catch(() => ({ products: [], total: 0, page: 1, pages: 1 }));
  const cats = await listCategories().catch(() => []);

  return (
    <div>
      {/* HERO */}
      <section className="relative h-screen flex flex-col justify-center px-6 md:px-10 overflow-hidden">
        <Blobs />
        <div className="relative z-10 max-w-7xl">
          <p className="label text-ink/60 mb-6 reveal">New season — 2026</p>
          <h1 className="display reveal" style={{ fontSize: 'clamp(3rem, 18vw, 16rem)', lineHeight: 0.75 }}>
            RAW
            <br />
            <span className="block" style={{ marginLeft: '15vw' }}>FORM</span>
          </h1>
          <div className="reveal mt-8 flex flex-col md:flex-row md:items-end gap-8 md:gap-16">
            <p className="max-w-[400px] text-lg md:text-xl text-ink/80">
              Heavy type, considered goods. A boutique built for the bold — apparel, footwear, accessories.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/products" className="btn-cta">
                Shop the drop <ArrowRight size={16} />
              </Link>
              <Link href="/products?sort=newest" className="btn-ghost">
                New arrivals <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY DIVIDER */}
      <section
        className="relative py-32 px-6 md:px-10"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(248,163,72,0.20), transparent 60%)' }}
      >
        <h2 className="display reveal" style={{ fontSize: 'clamp(2.5rem, 12vw, 11rem)', opacity: 0.9 }}>
          The Catalog
        </h2>
      </section>

      {/* FEATURED GRID */}
      <section className="px-6 md:px-10 pb-24">
        <div className="flex items-end justify-between mb-12">
          <h3 className="display text-4xl md:text-6xl">Featured</h3>
          <Link href="/products" className="btn-ghost">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <ProductGrid products={featured.products} />
      </section>

      {/* CATEGORY CHIPS */}
      <section className="px-6 md:px-10 py-16 border-t border-ink/10">
        <div className="flex flex-wrap gap-3">
          {cats.map((c) => (
            <Link
              key={c.name}
              href={`/products?category=${encodeURIComponent(c.name)}`}
              className="label border border-ink/30 px-5 py-3 hover:bg-ink hover:text-base transition-colors"
            >
              {c.name} <span className="opacity-50">({c.product_count})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CAMPAIGN BLOCK */}
      <section className="bg-panel py-32 px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-8">
            <h2 className="display reveal" style={{ fontSize: 'clamp(2rem, 6vw, 6rem)', lineHeight: 0.9 }}>
              Members get more.<br />Codes that hit harder.
            </h2>
            <p className="mt-6 max-w-md text-ink/70">
              Sign in to unlock member pricing, order tracking, and coupon codes like{' '}
              <span className="text-accent font-bold">WELCOME10</span> and{' '}
              <span className="text-accent font-bold">SAVE20</span>.
            </p>
          </div>
          <div className="md:col-span-4 flex flex-col gap-6 md:items-end">
            {[
              ['Create an account', '/account'],
              ['Sign in', '/account'],
              ['Browse the catalog', '/products'],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 border border-ink/20 rounded-full px-5 py-3 w-fit hover:border-ink transition-colors"
              >
                <span className="label">{label}</span>
                <span className="w-7 h-7 rounded-full border border-ink/30 flex items-center justify-center">
                  <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
