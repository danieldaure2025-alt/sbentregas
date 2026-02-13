import { NextRequest, NextResponse } from 'next/server';

// TEMPORARILY DISABLED - Stripe removed, will implement Pagar.me
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Payment confirmation is temporarily disabled',
      message: 'Pagar.me integration coming soon. Contact support for manual payment processing.',
    },
    { status: 503 } // Service Unavailable
  );
}
