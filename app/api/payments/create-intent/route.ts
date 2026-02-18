import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { createPaymentIntent } from '@/lib/stripe';
import { logAuditAction } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verify ownership
    if (order.clientId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Check if order already has a payment intent
    if (order.paymentIntentId) {
      // Return existing payment intent
      const { retrievePaymentIntent } = await import('@/lib/stripe');
      const existingIntent = await retrievePaymentIntent(order.paymentIntentId);
      
      return NextResponse.json({
        clientSecret: existingIntent.client_secret,
        paymentIntentId: existingIntent.id,
      });
    }

    // Create a new payment intent
    const paymentIntent = await createPaymentIntent({
      amount: order.price,
      currency: 'brl',
      metadata: {
        orderId: order.id,
        clientId: order.clientId,
        clientEmail: order.client.email,
      },
    });

    // Update order with payment intent ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentIntentId: paymentIntent.id,
      },
    });

    // Log the action
    await logAuditAction({
      userId: session.user.id,
      orderId: order.id,
      action: 'PAYMENT_INTENT_CREATED',
      details: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        amount: order.price,
      }),
      request,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Erro ao criar intent de pagamento' },
      { status: 500 }
    );
  }
}
