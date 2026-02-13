import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { haversineDistance, GEO_CONSTANTS } from '@/lib/geo-utils';
import { DeliveryPersonStatus, EventType, OfferStatus, OrderStatus, NotificationType, OfferFailureReason } from '@prisma/client';
import { sendNewOrderNotification, sendPushNotification } from '@/lib/firebase-admin';

/**
 * Notifica todos os admins sobre falha crítica no pedido
 */
async function notifyAdminsOrderFailed(
  orderId: string,
  attemptCount: number,
  orderDetails: { originAddress: string; destinationAddress: string; price: number }
) {
  try {
    // Buscar todos os admins com FCM token
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
        fcmToken: { not: null },
      },
      select: {
        id: true,
        fcmToken: true,
        name: true,
      },
    });

    const title = '🚨 ALERTA CRÍTICO: Pedido sem entregador';
    const body = `Pedido #${orderId.slice(-8)} falhou após ${attemptCount} tentativas. Nenhum entregador disponível.`;

    // Criar notificação no banco para cada admin
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: NotificationType.NO_DRIVER_AVAILABLE,
          title,
          body,
          data: JSON.stringify({
            orderId,
            attemptCount,
            originAddress: orderDetails.originAddress,
            destinationAddress: orderDetails.destinationAddress,
            price: orderDetails.price,
            failedAt: new Date().toISOString(),
          }),
        },
      });

      // Enviar push notification
      if (admin.fcmToken) {
        try {
          await sendPushNotification(admin.fcmToken, {
            title,
            body,
            data: {
              type: 'NO_DRIVER_AVAILABLE',
              orderId,
              attemptCount: String(attemptCount),
            },
          });
          console.log(`[Fallback] Push enviado para admin ${admin.name}`);
        } catch (pushError) {
          console.error(`[Fallback] Erro ao enviar push para admin:`, pushError);
        }
      }
    }

    // Registrar evento crítico
    await prisma.eventLog.create({
      data: {
        userId: admins[0]?.id || 'system',
        orderId,
        eventType: EventType.STATUS_CHANGE,
        details: JSON.stringify({
          action: 'NO_COURIER_AVAILABLE',
          attemptCount,
          reason: 'Todas as tentativas de atribuição falharam',
          notifiedAdmins: admins.map(a => a.name).join(', '),
        }),
      },
    });

    console.log(`[Fallback] ${admins.length} admins notificados sobre pedido ${orderId}`);
    return admins.length;
  } catch (error) {
    console.error('[Fallback] Erro ao notificar admins:', error);
    return 0;
  }
}

// POST - Auto distribuir pedidos pendentes sem oferta ativa
// Chamado via cron ou manualmente
export async function POST(request: NextRequest) {
  try {
    // Verificar header de cron (opcional)
    const cronSecret = request.headers.get('x-cron-secret');
    const isAuthorized = cronSecret === process.env.CRON_SECRET || !process.env.CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date();

    // 1. Expirar ofertas antigas e marcar com motivo TIMEOUT
    const pendingExpiredOffers = await prisma.orderOffer.findMany({
      where: {
        status: OfferStatus.PENDING,
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        orderId: true,
        deliveryPersonId: true,
        attemptNumber: true,
      },
    });

    // Atualizar cada oferta expirada com motivo TIMEOUT
    for (const offer of pendingExpiredOffers) {
      await prisma.orderOffer.update({
        where: { id: offer.id },
        data: {
          status: OfferStatus.EXPIRED,
          failureReason: OfferFailureReason.TIMEOUT,
          respondedAt: now,
        },
      });

      // Registrar log de timeout
      await prisma.eventLog.create({
        data: {
          userId: offer.deliveryPersonId,
          orderId: offer.orderId,
          eventType: EventType.ORDER_REJECT,
          details: JSON.stringify({
            offerId: offer.id,
            reason: 'TIMEOUT',
            attemptNumber: offer.attemptNumber,
            message: 'Entregador não respondeu em 60 segundos',
          }),
        },
      });

      // Aplicar penalidade ao entregador por não responder
      await prisma.user.update({
        where: { id: offer.deliveryPersonId },
        data: {
          priorityScore: { increment: GEO_CONSTANTS.REJECTION_PENALTY_POINTS / 2 }, // Penalidade menor por timeout
          rejectionsToday: { increment: 1 },
        },
      });

      console.log(`[Fallback] Oferta ${offer.id} expirada por TIMEOUT (tentativa ${offer.attemptNumber})`);
    }

    console.log(`[Auto-Distribute] ${pendingExpiredOffers.length} ofertas expiradas por timeout`);

    // 2. Buscar pedidos PENDING sem entregador e sem oferta ativa
    const ordersNeedingDistribution = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        deliveryPersonId: null,
        orderOffers: {
          none: {
            status: OfferStatus.PENDING,
            expiresAt: { gt: now },
          },
        },
      },
      include: {
        orderOffers: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    console.log(`[Auto-Distribute] ${ordersNeedingDistribution.length} pedidos precisam de distribuição`);

    if (ordersNeedingDistribution.length === 0) {
      return NextResponse.json({
        success: true,
        expiredCount: pendingExpiredOffers.length,
        distributedCount: 0,
        failedCount: 0,
      });
    }

    // 3. Buscar entregadores disponíveis
    const availableDeliveryPersons = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_PERSON',
        status: 'ACTIVE',
        deliveryStatus: DeliveryPersonStatus.ONLINE,
        activeOrderId: null,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        fcmToken: { not: null },
      },
      select: {
        id: true,
        name: true,
        fcmToken: true,
        currentLatitude: true,
        currentLongitude: true,
        priorityScore: true,
      },
    });

    console.log(`[Auto-Distribute] ${availableDeliveryPersons.length} entregadores disponíveis`);

    let distributedCount = 0;
    let failedCount = 0;

    for (const order of ordersNeedingDistribution) {
      // Calcular número da próxima tentativa
      const lastAttempt = order.orderOffers[0];
      const currentAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

      // Verificar se atingiu o limite máximo de tentativas
      if (currentAttemptNumber > GEO_CONSTANTS.MAX_OFFER_ATTEMPTS) {
        console.log(`[Fallback] Pedido ${order.id} atingiu ${currentAttemptNumber - 1} tentativas - marcando como NO_COURIER_AVAILABLE`);

        // Atualizar status do pedido
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.NO_COURIER_AVAILABLE,
            updatedAt: now,
          },
        });

        // Notificar admins
        await notifyAdminsOrderFailed(order.id, currentAttemptNumber - 1, {
          originAddress: order.originAddress,
          destinationAddress: order.destinationAddress,
          price: order.price,
        });

        failedCount++;
        continue;
      }

      if (!order.originLatitude || !order.originLongitude) continue;

      // Buscar entregadores que já recusaram/expiraram este pedido
      const previousOfferDeliveryPersonIds = await prisma.orderOffer.findMany({
        where: {
          orderId: order.id,
          status: { in: [OfferStatus.REJECTED, OfferStatus.EXPIRED] },
        },
        select: { deliveryPersonId: true },
      });

      const excludedIds = new Set(previousOfferDeliveryPersonIds.map(o => o.deliveryPersonId));

      // Calcular distância para cada entregador (excluindo os que já recusaram)
      const nearbyDeliveryPersons = availableDeliveryPersons
        .filter(dp => !excludedIds.has(dp.id))
        .map((dp) => ({
          ...dp,
          distance: haversineDistance(
            dp.currentLatitude!,
            dp.currentLongitude!,
            order.originLatitude!,
            order.originLongitude!
          ),
        }))
        .filter((dp) => dp.distance <= GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM)
        .sort((a, b) => {
          if (a.priorityScore !== b.priorityScore) {
            return a.priorityScore - b.priorityScore;
          }
          return a.distance - b.distance;
        });

      // Verificar se o entregador já tem oferta pendente para outro pedido
      const availableNow = [];
      for (const dp of nearbyDeliveryPersons) {
        const hasActiveOffer = await prisma.orderOffer.findFirst({
          where: {
            deliveryPersonId: dp.id,
            status: OfferStatus.PENDING,
            expiresAt: { gt: now },
          },
        });
        if (!hasActiveOffer) {
          availableNow.push(dp);
        }
      }

      if (availableNow.length === 0) {
        console.log(`[Auto-Distribute] Nenhum entregador disponível para pedido ${order.id} (tentativa ${currentAttemptNumber})`);
        
        // Se não há entregadores e já estamos na última tentativa
        if (currentAttemptNumber >= GEO_CONSTANTS.MAX_OFFER_ATTEMPTS) {
          console.log(`[Fallback] Pedido ${order.id} sem entregadores disponíveis - marcando como NO_COURIER_AVAILABLE`);
          
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.NO_COURIER_AVAILABLE,
              updatedAt: now,
            },
          });

          await notifyAdminsOrderFailed(order.id, currentAttemptNumber, {
            originAddress: order.originAddress,
            destinationAddress: order.destinationAddress,
            price: order.price,
          });

          failedCount++;
        }
        continue;
      }

      const selectedDP = availableNow[0];
      const expiresAt = new Date(now.getTime() + GEO_CONSTANTS.OFFER_TIMEOUT_SECONDS * 1000);

      // Criar oferta com número da tentativa
      const newOffer = await prisma.orderOffer.create({
        data: {
          orderId: order.id,
          deliveryPersonId: selectedDP.id,
          distanceToPickup: selectedDP.distance,
          attemptNumber: currentAttemptNumber,
          offeredAt: now,
          expiresAt,
        },
      });

      // Registrar evento
      await prisma.eventLog.create({
        data: {
          userId: selectedDP.id,
          orderId: order.id,
          eventType: EventType.ORDER_OFFER,
          details: JSON.stringify({
            offerId: newOffer.id,
            distance: selectedDP.distance.toFixed(2),
            expiresAt: expiresAt.toISOString(),
            attemptNumber: currentAttemptNumber,
            maxAttempts: GEO_CONSTANTS.MAX_OFFER_ATTEMPTS,
            autoDistributed: true,
          }),
        },
      });

      // Enviar push notification
      if (selectedDP.fcmToken) {
        try {
          await sendNewOrderNotification(
            [selectedDP.fcmToken],
            {
              orderId: order.id,
              originAddress: order.originAddress,
              destinationAddress: order.destinationAddress,
              price: order.price,
              distance: order.distance || 0,
            }
          );
          console.log(`[Auto-Distribute] Push enviado para ${selectedDP.name} (tentativa ${currentAttemptNumber}/${GEO_CONSTANTS.MAX_OFFER_ATTEMPTS})`);
        } catch (pushError) {
          console.error(`[Auto-Distribute] Erro ao enviar push:`, pushError);
        }
      }

      distributedCount++;
      console.log(`[Auto-Distribute] Pedido ${order.id} oferecido para ${selectedDP.name} (${selectedDP.distance.toFixed(2)}km) - Tentativa ${currentAttemptNumber}/${GEO_CONSTANTS.MAX_OFFER_ATTEMPTS}`);
    }

    return NextResponse.json({
      success: true,
      expiredCount: pendingExpiredOffers.length,
      distributedCount,
      failedCount,
      totalOrders: ordersNeedingDistribution.length,
    });
  } catch (error) {
    console.error('[Auto-Distribute] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// GET - Também permitir GET para facilitar chamadas
export async function GET(request: NextRequest) {
  return POST(request);
}
