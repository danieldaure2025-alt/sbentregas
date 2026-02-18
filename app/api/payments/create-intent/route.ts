import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Stripe está desabilitado
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Pagamentos via Stripe estão temporariamente desabilitados' },
    { status: 503 }
  );
}
