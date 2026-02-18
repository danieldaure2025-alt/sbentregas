import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Stripe webhook está desabilitado
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Stripe webhook está temporariamente desabilitado' },
    { status: 503 }
  );
}
