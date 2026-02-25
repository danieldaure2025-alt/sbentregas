import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { DeliveryPersonStatus, EventType } from '@prisma/client';

// GET - Obter status atual do entregador
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        role: true,
        deliveryStatus: true,
        activeOrderId: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
        priorityScore: true,
        rejectionsToday: true,
      },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores' }, { status: 403 });
    }

    // Buscar oferta pendente
    const pendingOffer = await prisma.orderOffer.findFirst({
      where: {
        deliveryPersonId: user.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        order: {
          select: {
            id: true,
            originAddress: true,
            destinationAddress: true,
            price: true,
            distance: true,
            notes: true,
            client: {
              select: { name: true, phone: true },
            },
          },
        },
      },
      orderBy: { offeredAt: 'desc' },
    });

    // Calcular tempo restante da oferta
    let offerTimeRemaining = null;
    if (pendingOffer) {
      offerTimeRemaining = Math.max(
        0,
        Math.floor((pendingOffer.expiresAt.getTime() - Date.now()) / 1000)
      );
    }

    // Buscar pedido ativo
    let activeOrder = null;
    if (user.activeOrderId) {
      activeOrder = await prisma.order.findUnique({
        where: { id: user.activeOrderId },
        select: {
          id: true,
          status: true,
          originAddress: true,
          originLatitude: true,
          originLongitude: true,
          destinationAddress: true,
          destinationLatitude: true,
          destinationLongitude: true,
          price: true,
          distance: true,
          notes: true,
          client: {
            select: { name: true, phone: true },
          },
        },
      });
    }

    return NextResponse.json({
      status: user.deliveryStatus,
      location: {
        latitude: user.currentLatitude,
        longitude: user.currentLongitude,
        lastUpdate: user.lastLocationUpdate,
      },
      priorityScore: user.priorityScore,
      rejectionsToday: user.rejectionsToday,
      pendingOffer: pendingOffer ? {
        id: pendingOffer.id,
        order: pendingOffer.order,
        distanceToPickup: pendingOffer.distanceToPickup,
        timeRemaining: offerTimeRemaining,
        expiresAt: pendingOffer.expiresAt,
      } : null,
      activeOrder,
    });
  } catch (error) {
    console.error('Erro ao obter status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Alterar status do entregador
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        role: true,
        status: true,
        deliveryStatus: true,
        activeOrderId: true,
      },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores' }, { status: 403 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Conta não está ativa' }, { status: 403 });
    }

    const { newStatus, latitude, longitude } = await request.json();

    // Validar transições de status
    const validTransitions: Record<DeliveryPersonStatus, DeliveryPersonStatus[]> = {
      OFFLINE: ['ONLINE'],
      ONLINE: ['OFFLINE', 'EM_ROTA_COLETA', 'EM_EMERGENCIA'],
      EM_ROTA_COLETA: ['EM_ROTA_ENTREGA', 'ONLINE', 'EM_EMERGENCIA'],
      EM_ROTA_ENTREGA: ['ONLINE', 'EM_EMERGENCIA'],
      EM_EMERGENCIA: ['ONLINE', 'OFFLINE'],
    };

    if (!validTransitions[user.deliveryStatus]?.includes(newStatus)) {
      return NextResponse.json({
        error: `Transição inválida: ${user.deliveryStatus} → ${newStatus}`
      }, { status: 400 });
    }

    // Se estiver indo ONLINE com pedido ativo, não permitir
    if (newStatus === 'ONLINE' && user.activeOrderId) {
      return NextResponse.json({
        error: 'Finalize o pedido atual antes de ficar ONLINE'
      }, { status: 400 });
    }

    const now = new Date();

    // Atualizar status
    const updateData: Record<string, unknown> = {
      deliveryStatus: newStatus,
      isOnline: newStatus !== 'OFFLINE',
      lastOnlineAt: now,
    };

    // Se ficando ONLINE, resetar rejeições se for novo dia
    if (newStatus === 'ONLINE' && user.deliveryStatus === 'OFFLINE') {
      const lastReset = await prisma.user.findUnique({
        where: { id: user.id },
        select: { lastRejectionsReset: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!lastReset?.lastRejectionsReset || lastReset.lastRejectionsReset < today) {
        updateData.rejectionsToday = 0;
        updateData.lastRejectionsReset = now;
      }
    }

    // Se ficando OFFLINE, limpar localização
    if (newStatus === 'OFFLINE') {
      updateData.currentLatitude = null;
      updateData.currentLongitude = null;
    }

    // Se tiver localização, atualizar
    if (latitude && longitude) {
      updateData.currentLatitude = latitude;
      updateData.currentLongitude = longitude;
      updateData.lastLocationUpdate = now;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Registrar evento de mudança de status
    await prisma.eventLog.create({
      data: {
        userId: user.id,
        orderId: user.activeOrderId,
        eventType: EventType.STATUS_CHANGE,
        details: JSON.stringify({
          from: user.deliveryStatus,
          to: newStatus,
        }),
        latitude,
        longitude,
      },
    });

    return NextResponse.json({
      success: true,
      newStatus,
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
