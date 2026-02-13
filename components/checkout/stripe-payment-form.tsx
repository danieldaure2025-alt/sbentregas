'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading';
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react';

interface StripePaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function StripePaymentForm({
  orderId,
  amount,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/orders/${orderId}?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setMessage(error.message || 'Erro no pagamento');
          onError(error.message || 'Erro no pagamento');
        } else {
          setMessage('Ocorreu um erro inesperado.');
          onError('Ocorreu um erro inesperado.');
        }
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on our backend
        const confirmResponse = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        if (confirmResponse.ok) {
          onSuccess();
        } else {
          const data = await confirmResponse.json();
          onError(data.error || 'Erro ao confirmar pagamento');
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setMessage('Erro ao processar pagamento');
      onError('Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Total a pagar</span>
          <span className="text-2xl font-bold text-green-500">
            R$ {amount.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <span>Pagamento seguro processado pelo Stripe</span>
        </div>
      </div>

      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {message && (
        <div className="text-red-400 text-sm text-center p-2 bg-red-900/30 rounded border border-red-500/30">
          {message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="w-full h-12 text-lg bg-orange-500 hover:bg-orange-600 text-white"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Pagar R$ {amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
}
