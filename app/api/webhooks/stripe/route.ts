import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    // If webhook secret is configured, verify the signature
    if (webhookSecret) {
      try {
        event = stripe().webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      // For development without webhook secret
      event = JSON.parse(body) as Stripe.Event;
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Find and update the order
        const order = await prisma.order.findUnique({
          where: { paymentIntentId: paymentIntent.id },
        });

        if (order && order.status === 'AWAITING_PAYMENT') {
          const platformFeePercentage = 0.15;
          const platformFee = order.price * platformFeePercentage;
          const deliveryFee = order.price - platformFee;

          await prisma.$transaction([
            prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.PENDING },
            }),
            prisma.transaction.upsert({
              where: {
                id: (await prisma.transaction.findFirst({ where: { orderId: order.id } }))?.id || 'new',
              },
              update: {
                paymentStatus: PaymentStatus.COMPLETED,
                stripePaymentId: paymentIntent.id,
              },
              create: {
                orderId: order.id,
                totalAmount: order.price,
                platformFee,
                deliveryFee,
                paymentStatus: PaymentStatus.COMPLETED,
                paymentMethod: 'CREDIT_CARD',
                stripePaymentId: paymentIntent.id,
              },
            }),
          ]);

          console.log(`Order ${order.id} payment completed via webhook`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const order = await prisma.order.findUnique({
          where: { paymentIntentId: paymentIntent.id },
        });

        if (order) {
          console.log(`Payment failed for order ${order.id}`);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const order = await prisma.order.findUnique({
          where: { paymentIntentId: paymentIntent.id },
        });

        if (order && order.status === 'AWAITING_PAYMENT') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED },
          });
          console.log(`Order ${order.id} cancelled due to payment cancellation`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
