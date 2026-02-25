import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { GEO_CONSTANTS } from '@/lib/geo-utils';
import { DeliveryPersonStatus, EventType, OfferStatus, OrderStatus, OfferFailureReason } from '@prisma/client';

// POST - Aceitar ou rejeitar oferta de pedido
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        role: true,
        deliveryStatus: true,
        rejectionsToday: true,
        priorityScore: true,
      },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores' }, { status: 403 });
    }

    const { offerId, accept, latitude, longitude } = await request.json();

    if (!offerId || accept === undefined) {
      return NextResponse.json({ error: 'offerId e accept são obrigatórios' }, { status: 400 });
    }

    // Buscar oferta
    const offer = await prisma.orderOffer.findUnique({
      where: { id: offerId },
      include: {
        order: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Oferta não encontrada' }, { status: 404 });
    }

    if (offer.deliveryPersonId !== user.id) {
      return NextResponse.json({ error: 'Oferta não pertence a você' }, { status: 403 });
    }

    if (offer.status !== OfferStatus.PENDING) {
      return NextResponse.json({ error: 'Oferta já foi respondida' }, { status: 400 });
    }

    // Verificar se expirou
    if (new Date() > offer.expiresAt) {
      // Marcar como expirada com motivo TIMEOUT
      await prisma.orderOffer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.EXPIRED,
          failureReason: OfferFailureReason.TIMEOUT,
          respondedAt: new Date(),
        },
      });

      // Registrar log de timeout
      await prisma.eventLog.create({
        data: {
          userId: user.id,
          orderId: offer.orderId,
          eventType: EventType.ORDER_REJECT,
          details: JSON.stringify({
            offerId,
            reason: 'TIMEOUT',
            attemptNumber: offer.attemptNumber,
            message: 'Oferta expirou antes de resposta',
          }),
        },
      });

      // Incrementar rejeições (expirar conta como rejeição)
      await incrementRejection(user.id, user.rejectionsToday, user.priorityScore);

      return NextResponse.json({ error: 'Oferta expirada' }, { status: 400 });
    }

    const now = new Date();

    if (accept) {
      // ACEITAR PEDIDO

      // Verificar se pedido ainda está disponível
      if (offer.order.status !== OrderStatus.PENDING || offer.order.deliveryPersonId) {
        await prisma.orderOffer.update({
          where: { id: offerId },
          data: { status: OfferStatus.EXPIRED, respondedAt: now },
        });
        return NextResponse.json({ error: 'Pedido não está mais disponível' }, { status: 400 });
      }

      // Atualizar oferta
      await prisma.orderOffer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.ACCEPTED,
          respondedAt: now,
        },
      });

      // Atualizar pedido
      await prisma.order.update({
        where: { id: offer.orderId },
        data: {
          deliveryPersonId: user.id,
          status: OrderStatus.ACCEPTED,
          acceptedAt: now,
        },
      });

      // Atualizar entregador
      await prisma.user.update({
        where: { id: user.id },
        data: {
          deliveryStatus: DeliveryPersonStatus.EM_ROTA_COLETA,
          activeOrderId: offer.orderId,
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: now,
        },
      });

      // Registrar evento
      await prisma.eventLog.create({
        data: {
          userId: user.id,
          orderId: offer.orderId,
          eventType: EventType.ORDER_ACCEPT,
          details: JSON.stringify({ offerId }),
          latitude,
          longitude,
        },
      });

      // Cancelar outras ofertas pendentes para este pedido
      await prisma.orderOffer.updateMany({
        where: {
          orderId: offer.orderId,
          id: { not: offerId },
          status: OfferStatus.PENDING,
        },
        data: { status: OfferStatus.EXPIRED },
      });

      return NextResponse.json({
        success: true,
        message: 'Pedido aceito! Vá até o local de coleta.',
        orderId: offer.orderId,
        newStatus: DeliveryPersonStatus.EM_ROTA_COLETA,
      });
    } else {
      // REJEITAR PEDIDO

      // Atualizar oferta com motivo REJECTED
      await prisma.orderOffer.update({
        where: { id: offerId },
        data: {
          status: OfferStatus.REJECTED,
          failureReason: OfferFailureReason.REJECTED,
          respondedAt: now,
        },
      });

      // Registrar evento com detalhes da tentativa
      await prisma.eventLog.create({
        data: {
          userId: user.id,
          orderId: offer.orderId,
          eventType: EventType.ORDER_REJECT,
          details: JSON.stringify({
            offerId,
            reason: 'REJECTED',
            attemptNumber: offer.attemptNumber,
            message: 'Entregador recusou manualmente',
          }),
          latitude,
          longitude,
        },
      });

      // Incrementar rejeições e penalidade
      const updated = await incrementRejection(user.id, user.rejectionsToday, user.priorityScore);

      // Verificar se deve pausar automaticamente
      if (updated.rejectionsToday >= GEO_CONSTANTS.MAX_REJECTIONS_BEFORE_PAUSE) {
        await prisma.user.update({
          where: { id: user.id },
          data: { deliveryStatus: DeliveryPersonStatus.OFFLINE, isOnline: false },
        });

        return NextResponse.json({
          success: true,
          message: 'Pedido rejeitado. Você foi pausado por muitas rejeições.',
          paused: true,
          rejectionsToday: updated.rejectionsToday,
        });
      }

      // Tentar oferecer para próximo entregador
      // (Isso será feito automaticamente pelo cron/polling)

      return NextResponse.json({
        success: true,
        message: 'Pedido rejeitado.',
        rejectionsToday: updated.rejectionsToday,
        priorityScore: updated.priorityScore,
      });
    }
  } catch (error) {
    console.error('Erro ao responder oferta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function incrementRejection(userId: string, currentRejections: number, currentPriority: number) {
  const newRejections = currentRejections + 1;
  const newPriority = currentPriority + GEO_CONSTANTS.REJECTION_PENALTY_POINTS;

  await prisma.user.update({
    where: { id: userId },
    data: {
      rejectionsToday: newRejections,
      priorityScore: newPriority,
    },
  });

  return { rejectionsToday: newRejections, priorityScore: newPriority };
}
