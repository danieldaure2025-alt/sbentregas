import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { haversineDistance, GEO_CONSTANTS } from '@/lib/geo-utils';
import { DeliveryPersonStatus, EventType, OfferStatus, OrderStatus } from '@prisma/client';

// POST - Criar oferta para um pedido (distribuição por proximidade)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório' }, { status: 400 });
    }

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        originLatitude: true,
        originLongitude: true,
        originAddress: true,
        deliveryPersonId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (order.status !== OrderStatus.PENDING) {
      return NextResponse.json({ error: 'Pedido não está disponível' }, { status: 400 });
    }

    if (order.deliveryPersonId) {
      return NextResponse.json({ error: 'Pedido já atribuído' }, { status: 400 });
    }

    // Verificar se já existe oferta pendente
    const existingOffer = await prisma.orderOffer.findFirst({
      where: {
        orderId: order.id,
        status: OfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingOffer) {
      return NextResponse.json({
        error: 'Já existe uma oferta pendente para este pedido',
        offerId: existingOffer.id,
      }, { status: 400 });
    }

    // Buscar entregadores disponíveis
    const availableDeliveryPersons = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_PERSON',
        status: 'ACTIVE',
        deliveryStatus: DeliveryPersonStatus.ONLINE,
        activeOrderId: null,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        currentLatitude: true,
        currentLongitude: true,
        priorityScore: true,
        rejectionsToday: true,
      },
    });

    if (availableDeliveryPersons.length === 0) {
      return NextResponse.json({
        error: 'Nenhum entregador disponível no momento',
        waitingForDelivery: true,
      }, { status: 200 });
    }

    // Se não tiver coordenadas de origem, não pode calcular distância
    if (!order.originLatitude || !order.originLongitude) {
      // Geocodificar endereço de origem (usar primeiro entregador)
      const firstDelivery = availableDeliveryPersons[0];
      const offer = await createOffer(order.id, firstDelivery.id, 0);

      return NextResponse.json({
        success: true,
        offer,
        message: 'Oferta criada (sem coordenadas de origem)',
      });
    }

    // Calcular distância de cada entregador até o ponto de coleta
    const deliveryPersonsWithDistance = availableDeliveryPersons
      .map((dp) => ({
        ...dp,
        distance: haversineDistance(
          dp.currentLatitude!,
          dp.currentLongitude!,
          order.originLatitude!,
          order.originLongitude!
        ),
      }))
      // Filtrar por distância máxima
      .filter((dp) => dp.distance <= GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM)
      // Ordenar por distância (mais próximo primeiro) e priority score
      .sort((a, b) => {
        // Primeiro por priority (menor é melhor)
        if (a.priorityScore !== b.priorityScore) {
          return a.priorityScore - b.priorityScore;
        }
        // Depois por distância
        return a.distance - b.distance;
      });

    if (deliveryPersonsWithDistance.length === 0) {
      return NextResponse.json({
        error: 'Nenhum entregador próximo o suficiente',
        waitingForDelivery: true,
      }, { status: 200 });
    }

    // Criar oferta para o entregador mais próximo
    const selectedDeliveryPerson = deliveryPersonsWithDistance[0];
    const offer = await createOffer(
      order.id,
      selectedDeliveryPerson.id,
      selectedDeliveryPerson.distance
    );

    return NextResponse.json({
      success: true,
      offer,
      deliveryPerson: {
        id: selectedDeliveryPerson.id,
        name: selectedDeliveryPerson.name,
        distance: selectedDeliveryPerson.distance.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Erro ao criar oferta:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function createOffer(orderId: string, deliveryPersonId: string, distance: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GEO_CONSTANTS.OFFER_TIMEOUT_SECONDS * 1000);

  const offer = await prisma.orderOffer.create({
    data: {
      orderId,
      deliveryPersonId,
      distanceToPickup: distance,
      offeredAt: now,
      expiresAt,
    },
  });

  // Registrar evento
  await prisma.eventLog.create({
    data: {
      userId: deliveryPersonId,
      orderId,
      eventType: EventType.ORDER_OFFER,
      details: JSON.stringify({
        offerId: offer.id,
        distance: distance.toFixed(2),
        expiresAt: expiresAt.toISOString(),
      }),
    },
  });

  return offer;
}
