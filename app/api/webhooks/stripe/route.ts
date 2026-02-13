import { NextRequest, NextResponse } from 'next/server';

// TEMPORARILY DISABLED - Stripe removed, will implement Pagar.me webhooks
export async function POST(request: NextRequest) {
  console.warn('Stripe webhook endpoint called but Stripe is disabled');

  return NextResponse.json(
    {
      received: true,
      message: 'Stripe webhooks are temporarily disabled. Pagar.me webhooks coming soon.',
    },
    { status: 200 } // Return 200 to prevent retry storms
  );
}
