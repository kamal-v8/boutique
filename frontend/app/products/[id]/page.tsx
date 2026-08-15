import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProduct } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { AddToCartButton } from '@/components/AddToCartButton';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id).catch(() => null);
  if (!product) notFound();

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <p className="label text-ink/40 mb-8">
        <Link href="/products" className="hover:text-ink/70">Shop</Link> / {product.name}
      </p>
      <div className="flex flex-col md:flex-row gap-12 md:gap-20 max-w-6xl">
        <img src={product.picture} alt={product.name} className="w-full md:w-1/2 aspect-[3/4] object-cover" />
        <div className="flex-1 flex flex-col gap-6">
          <p className="label text-ink/60">{(product.categories || []).join(' · ')}</p>
          <h1 className="display text-4xl md:text-6xl">{product.name}</h1>
          <p className="text-2xl">{formatMoney(product.price)}</p>
          <p className="text-ink/70 max-w-md">{product.description}</p>
          <p className="text-sm text-ink/50">
            SKU {product.sku} · {product.stock} in stock
          </p>
          <AddToCartButton productId={product.id} outOfStock={product.stock <= 0} />
        </div>
      </div>
    </main>
  );
}
