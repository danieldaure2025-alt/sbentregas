// STRIPE DISABLED - Will be replaced with Pagar.me
// This is a placeholder to prevent build errors

// Temporary stub exports for compatibility
export const stripe = null;

export async function createPaymentIntent({
  amount,
  currency = 'brl',
  metadata,
}: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}) {
  throw new Error('Payment processing is temporarily disabled. Pagar.me integration coming soon.');
}

export async function retrievePaymentIntent(paymentIntentId: string) {
  throw new Error('Payment processing is temporarily disabled. Pagar.me integration coming soon.');
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  throw new Error('Payment processing is temporarily disabled. Pagar.me integration coming soon.');
}

// TODO: Implement Pagar.me integration
// export const pagarme = ...
