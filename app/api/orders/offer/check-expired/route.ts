import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { OfferStatus } from '@prisma/client';

// GET - Verificar e expirar ofertas antigas, redistribuir pedidos
export async function GET() {
  try {
    const now = new Date();

    // Buscar ofertas expiradas
    const expiredOffers = await prisma.orderOffer.findMany({
      where: {
        status: OfferStatus.PENDING,
        expiresAt: { lt: now },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            deliveryPersonId: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            rejectionsToday: true,
            priorityScore: true,
          },
        },
      },
    });

    const expiredCount = expiredOffers.length;
    const ordersToRedistribute: string[] = [];

    for (const offer of expiredOffers) {
      // Marcar como expirada
      await prisma.orderOffer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.EXPIRED },
      });

      // Penalizar entregador
      await prisma.user.update({
        where: { id: offer.deliveryPersonId },
        data: {
          rejectionsToday: offer.deliveryPerson.rejectionsToday + 1,
          priorityScore: offer.deliveryPerson.priorityScore + 5, // Penalidade menor por expiração
        },
      });

      // Se o pedido ainda está PENDING e sem entregador, adicionar para redistribuição
      if (offer.order.status === 'PENDING' && !offer.order.deliveryPersonId) {
        if (!ordersToRedistribute.includes(offer.orderId)) {
          ordersToRedistribute.push(offer.orderId);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      expiredCount,
      ordersToRedistribute,
    });
  } catch (error) {
    console.error('Erro ao verificar ofertas expiradas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
