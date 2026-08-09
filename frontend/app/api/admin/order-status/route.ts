import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { updateOrderStatus } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }
  try {
    const order = await updateOrderStatus(id, status);
    return NextResponse.json({ order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'failed to update order' }, { status: 400 });
  }
}
