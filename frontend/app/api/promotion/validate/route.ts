import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = String(body?.code || '').trim();
  const subtotalUnits = Number(body?.subtotal_units || 0);
  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }
  const v = await validateCoupon(code, subtotalUnits);
  return NextResponse.json(v);
}
