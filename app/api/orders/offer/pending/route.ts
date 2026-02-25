import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { OfferStatus } from '@prisma/client';

// GET - Buscar ofertas pendentes para o entregador com tempo restante
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores' }, { status: 403 });
    }

    const now = new Date();

    // Buscar ofertas pendentes não expiradas
    const pendingOffers = await prisma.orderOffer.findMany({
      where: {
        deliveryPersonId: user.id,
        status: OfferStatus.PENDING,
        expiresAt: { gt: now },
      },
      include: {
        order: {
          select: {
            id: true,
            originAddress: true,
            destinationAddress: true,
            price: true,
            distance: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        offeredAt: 'desc',
      },
    });

    // Calcular tempo restante para cada oferta
    const offersWithTimer = pendingOffers.map((offer) => {
      const expiresAtMs = offer.expiresAt.getTime();
      const nowMs = now.getTime();
      const remainingMs = Math.max(0, expiresAtMs - nowMs);
      const remainingSeconds = Math.floor(remainingMs / 1000);

      return {
        id: offer.id,
        orderId: offer.orderId,
        distanceToPickup: offer.distanceToPickup,
        offeredAt: offer.offeredAt.toISOString(),
        expiresAt: offer.expiresAt.toISOString(),
        remainingSeconds,
        order: {
          id: offer.order.id,
          originAddress: offer.order.originAddress,
          destinationAddress: offer.order.destinationAddress,
          price: offer.order.price,
          distance: offer.order.distance,
          clientName: offer.order.client.name,
        },
      };
    });

    return NextResponse.json({
      success: true,
      offers: offersWithTimer,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao buscar ofertas pendentes:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
