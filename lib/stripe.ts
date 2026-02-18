import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // @ts-ignore - Using latest API version
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

export { getStripe as stripe };

export async function createPaymentIntent({
  amount,
  currency = 'brl',
  metadata,
}: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}) {
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    payment_method_types: ['card'],
  });

  return paymentIntent;
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  return getStripe().paymentIntents.retrieve(paymentIntentId);
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  return getStripe().paymentIntents.cancel(paymentIntentId);
}
