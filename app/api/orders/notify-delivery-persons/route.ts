import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, UserStatus, DeliveryPersonStatus } from '@prisma/client';
import { sendNewOrderNotification } from '@/lib/firebase-admin';

/**
 * POST /api/orders/notify-delivery-persons
 * Send push notification to all online delivery persons about a new order
 * Called after an order is created and ready for delivery
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only system/admin or the order creator can trigger notifications
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID do pedido é obrigatório' },
        { status: 400 }
      );
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        originAddress: true,
        destinationAddress: true,
        price: true,
        distance: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Only notify for PENDING orders
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Apenas pedidos pendentes podem ser notificados' },
        { status: 400 }
      );
    }

    // Get all online delivery persons with FCM tokens
    const onlineDeliveryPersons = await prisma.user.findMany({
      where: {
        role: UserRole.DELIVERY_PERSON,
        status: UserStatus.ACTIVE,
        fcmToken: { not: null },
        OR: [
          { isOnline: true },
          { deliveryStatus: DeliveryPersonStatus.ONLINE },
        ],
      },
      select: {
        id: true,
        name: true,
        fcmToken: true,
      },
    });

    if (onlineDeliveryPersons.length === 0) {
      console.log('No online delivery persons with FCM tokens found');
      return NextResponse.json({
        success: true,
        message: 'Nenhum entregador online com notificações ativas',
        notified: 0,
      });
    }

    // Extract FCM tokens
    const fcmTokens = onlineDeliveryPersons
      .map(dp => dp.fcmToken)
      .filter((token): token is string => token !== null);

    console.log(`Sending push notifications to ${fcmTokens.length} delivery persons for order ${orderId}`);

    // Send push notifications
    const result = await sendNewOrderNotification(fcmTokens, {
      orderId: order.id,
      originAddress: order.originAddress,
      destinationAddress: order.destinationAddress,
      price: order.price,
      distance: order.distance || 0,
    });

    console.log(`Push notification result: ${result.successCount} success, ${result.failureCount} failures`);

    return NextResponse.json({
      success: true,
      message: `Notificações enviadas para ${result.successCount} entregadores`,
      notified: result.successCount,
      failed: result.failureCount,
      totalOnline: onlineDeliveryPersons.length,
    });
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar notificações push' },
      { status: 500 }
    );
  }
}
