import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { upsertCoupon, deleteCoupon } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const coupon = body?.coupon;
  if (!coupon || typeof coupon !== 'object' || !coupon.code) {
    return NextResponse.json({ error: 'coupon payload with a code is required' }, { status: 400 });
  }
  try {
    const saved = await upsertCoupon(coupon);
    return NextResponse.json({ coupon: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'failed to save coupon' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const code = body?.code;
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }
  try {
    await deleteCoupon(code);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.details || 'failed to delete coupon' }, { status: 400 });
  }
}
