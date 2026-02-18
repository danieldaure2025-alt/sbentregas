import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { retrievePaymentIntent } from '@/lib/stripe';
import { logAuditAction } from '@/lib/audit-logger';
import { OrderStatus, PaymentStatus, UserRole, UserStatus, DeliveryPersonStatus } from '@prisma/client';
import { sendNewOrderNotification } from '@/lib/firebase-admin';
import { haversineDistance, GEO_CONSTANTS } from '@/lib/geo-utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'ID do Payment Intent é obrigatório' }, { status: 400 });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: 'Pagamento não foi completado',
        status: paymentIntent.status 
      }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { paymentIntentId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verify ownership
    if (order.clientId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Update order status to PENDING (available for delivery persons)
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PENDING,
      },
    });

    // Update or create transaction
    const platformFeePercentage = 0.15; // 15% platform fee
    const platformFee = order.price * platformFeePercentage;
    const deliveryFee = order.price - platformFee;

    await prisma.transaction.upsert({
      where: {
        id: (await prisma.transaction.findFirst({ where: { orderId: order.id } }))?.id || 'new',
      },
      update: {
        paymentStatus: PaymentStatus.COMPLETED,
        stripePaymentId: paymentIntentId,
      },
      create: {
        orderId: order.id,
        totalAmount: order.price,
        platformFee,
        deliveryFee,
        paymentStatus: PaymentStatus.COMPLETED,
        paymentMethod: 'CREDIT_CARD',
        stripePaymentId: paymentIntentId,
      },
    });

    // Log the action
    await logAuditAction({
      userId: session.user.id,
      orderId: order.id,
      action: 'PAYMENT_COMPLETED',
      details: JSON.stringify({
        paymentIntentId,
        amount: order.price,
      }),
      request,
    });

    // Enviar notificações push para entregadores próximos ao local de coleta
    try {
      const onlineDeliveryPersons = await prisma.user.findMany({
        where: {
          role: UserRole.DELIVERY_PERSON,
          status: UserStatus.ACTIVE,
          fcmToken: { not: null },
          currentLatitude: { not: null },
          currentLongitude: { not: null },
          OR: [
            { isOnline: true },
            { deliveryStatus: DeliveryPersonStatus.ONLINE },
          ],
        },
        select: { 
          fcmToken: true,
          currentLatitude: true,
          currentLongitude: true,
          name: true,
        },
      });

      // Filtrar entregadores por proximidade
      const nearbyDeliveryPersons = onlineDeliveryPersons.filter(dp => {
        if (!dp.currentLatitude || !dp.currentLongitude || !order.originLatitude || !order.originLongitude) return false;
        
        const distanceToPickup = haversineDistance(
          dp.currentLatitude,
          dp.currentLongitude,
          order.originLatitude,
          order.originLongitude
        );
        
        console.log(`Entregador ${dp.name}: ${distanceToPickup.toFixed(2)}km do ponto de coleta`);
        return distanceToPickup <= GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM;
      });

      const fcmTokens = nearbyDeliveryPersons
        .map(dp => dp.fcmToken)
        .filter((token): token is string => token !== null);

      console.log(`Pagamento confirmado - Entregadores online: ${onlineDeliveryPersons.length}, Próximos (${GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM}km): ${nearbyDeliveryPersons.length}`);

      if (fcmTokens.length > 0) {
        const pushResult = await sendNewOrderNotification(fcmTokens, {
          orderId: order.id,
          originAddress: order.originAddress,
          destinationAddress: order.destinationAddress,
          price: order.price,
          distance: order.distance || 0,
        });
        console.log(`Push notifications sent: ${pushResult.successCount} success, ${pushResult.failureCount} failures`);
      }
    } catch (pushError) {
      console.error('Error sending push notifications:', pushError);
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Erro ao confirmar pagamento' },
      { status: 500 }
    );
  }
}
