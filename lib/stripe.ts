import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // @ts-ignore - Using latest API version
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

export async function createPaymentIntent({
  amount,
  currency = 'brl',
  metadata,
}: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    metadata,
    payment_method_types: ['card'],
  });

  return paymentIntent;
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.cancel(paymentIntentId);
}
