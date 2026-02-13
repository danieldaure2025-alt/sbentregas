import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, UserStatus, OrderStatus, PaymentStatus, PaymentMethod, DeliveryPersonStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';
import { sendNewOrderNotification } from '@/lib/firebase-admin';
import { haversineDistance, GEO_CONSTANTS } from '@/lib/geo-utils';

export const dynamic = 'force-dynamic';

// POST - Confirmar pagamento (PIX/CASH)
// Admin: pode confirmar PIX e CASH
// Entregador: pode confirmar apenas CASH (quando estiver com a entrega)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const orderId = params.id;
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isDeliveryPerson = session.user.role === UserRole.DELIVERY_PERSON;

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { transactions: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const paymentMethod = order.paymentMethod;
    const isPix = paymentMethod === 'PIX';
    const isCash = paymentMethod === 'CASH';
    const isEndOfDay = paymentMethod === 'END_OF_DAY';

    // Validar permissões
    if (isPix && !isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem confirmar pagamentos PIX' },
        { status: 403 }
      );
    }

    if (isCash) {
      // Para CASH: Admin pode confirmar a qualquer momento
      // Entregador só pode confirmar se for o entregador designado
      if (!isAdmin && isDeliveryPerson) {
        if (order.deliveryPersonId !== session.user.id) {
          return NextResponse.json(
            { error: 'Você não é o entregador designado para este pedido' },
            { status: 403 }
          );
        }
        // Entregador só pode confirmar em status ACCEPTED, PICKED_UP, IN_TRANSIT
        const validStatuses = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'];
        if (!validStatuses.includes(order.status)) {
          return NextResponse.json(
            { error: 'O pagamento só pode ser confirmado durante a coleta ou entrega' },
            { status: 400 }
          );
        }
      } else if (!isAdmin) {
        return NextResponse.json(
          { error: 'Sem permissão para confirmar este pagamento' },
          { status: 403 }
        );
      }
    }

    if (isEndOfDay && !isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem confirmar pagamentos de final do dia' },
        { status: 403 }
      );
    }

    if (!isPix && !isCash && !isEndOfDay) {
      return NextResponse.json(
        { error: 'Método de pagamento não suporta confirmação manual' },
        { status: 400 }
      );
    }

    // Verificar se o pagamento já foi confirmado
    const transaction = order.transactions[0];
    if (transaction?.paymentStatus === PaymentStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Pagamento já foi confirmado anteriormente' },
        { status: 400 }
      );
    }

    // Calcular taxas
    const platformFeePercentage = 0.15; // 15%
    const platformFee = order.price * platformFeePercentage;
    const deliveryFee = order.price - platformFee;

    // Atualizar transação para COMPLETED
    if (transaction) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });
    } else {
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          totalAmount: order.price,
          platformFee,
          deliveryFee,
          paymentMethod: paymentMethod || 'CASH',
          paymentStatus: PaymentStatus.COMPLETED,
        },
      });
    }

    // Se o pedido está em AWAITING_PAYMENT (PIX), mudar para PENDING
    let updatedOrder = order;
    let shouldNotify = false;
    if (order.status === OrderStatus.AWAITING_PAYMENT) {
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PENDING,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          transactions: true,
        },
      });
      shouldNotify = true; // Marcar para notificar entregadores
    } else {
      // Buscar pedido atualizado
      updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          transactions: true,
        },
      }) as any;
    }

    // Determinar quem confirmou
    const confirmedBy = isAdmin ? 'admin' : 'entregador';
    const paymentLabel = isPix ? 'PIX' : isCash ? 'Dinheiro' : 'Final do Dia';

    // Log da ação
    await createAuditLog({
      userId: session.user.id,
      orderId: order.id,
      action: `${paymentMethod}_PAYMENT_CONFIRMED`,
      details: `Pagamento ${paymentLabel} confirmado pelo ${confirmedBy}. ${isPix ? 'Pedido liberado para coleta.' : ''}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    // Enviar notificações push para entregadores próximos (quando PIX é confirmado)
    if (shouldNotify && order.originLatitude && order.originLongitude) {
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
          if (!dp.currentLatitude || !dp.currentLongitude) return false;
          
          const distanceToPickup = haversineDistance(
            dp.currentLatitude,
            dp.currentLongitude,
            order.originLatitude!,
            order.originLongitude!
          );
          
          console.log(`Entregador ${dp.name}: ${distanceToPickup.toFixed(2)}km do ponto de coleta`);
          return distanceToPickup <= GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM;
        });

        const fcmTokens = nearbyDeliveryPersons
          .map(dp => dp.fcmToken)
          .filter((token): token is string => token !== null);

        console.log(`PIX confirmado - Entregadores online: ${onlineDeliveryPersons.length}, Próximos (${GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM}km): ${nearbyDeliveryPersons.length}`);

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
    }

    return NextResponse.json({
      success: true,
      message: `Pagamento ${paymentLabel} confirmado!${isPix ? ' Pedido liberado para coleta.' : ''}`,
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
