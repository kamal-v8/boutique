import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listProducts } from '@/lib/api';
import { allOrders, listCoupons } from '@/lib/admin';
import { AdminPanel } from '@/components/admin/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') redirect('/account');

  const [products, orders, coupons] = await Promise.all([
    listProducts({ pageSize: 200 }).catch(() => ({ products: [], total: 0, page: 1, pages: 1 })),
    allOrders().catch(() => []),
    listCoupons().catch(() => []),
  ]);

  return <AdminPanel products={products.products} orders={orders} coupons={coupons} />;
}
