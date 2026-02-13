'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { StripePaymentForm } from './stripe-payment-form';
import { Loading } from '@/components/shared/loading';
import { AlertCircle } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutWrapperProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function CheckoutWrapper({
  orderId,
  amount,
  onSuccess,
  onError,
}: CheckoutWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create PaymentIntent as soon as the component mounts
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao criar intent de pagamento');
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        onError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [orderId, onError]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loading />
        <p className="mt-4 text-gray-500">Preparando pagamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-center">{error}</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-center">Não foi possível iniciar o pagamento</p>
      </div>
    );
  }

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0ea5e9',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      borderRadius: '8px',
    },
  };

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance,
        locale: 'pt-BR',
      }}
    >
      <StripePaymentForm
        orderId={orderId}
        amount={amount}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
