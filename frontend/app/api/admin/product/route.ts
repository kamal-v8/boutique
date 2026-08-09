import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createProduct, updateProduct, deleteProduct } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const product = body?.product;
  if (!product || typeof product !== 'object') {
    return NextResponse.json({ error: 'product payload required' }, { status: 400 });
  }
  try {
    const saved = product.id ? await updateProduct(product) : await createProduct(product);
    return NextResponse.json({ product: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'failed to save product' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }
  try {
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'failed to delete product' }, { status: 400 });
  }
}
