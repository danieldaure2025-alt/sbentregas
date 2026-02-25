import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { DeliveryPersonStatus, EventType } from '@prisma/client';

// POST - Acionar botão de pânico
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
        name: true,
        role: true,
        deliveryStatus: true,
        activeOrderId: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores' }, { status: 403 });
    }

    const { latitude, longitude, reason } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Localização obrigatória para emergência' }, { status: 400 });
    }

    const now = new Date();

    // Criar alerta de emergência
    const alert = await prisma.emergencyAlert.create({
      data: {
        userId: user.id,
        reason: reason || 'Botão de pânico acionado',
        latitude,
        longitude,
      },
    });

    // Atualizar status do entregador
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deliveryStatus: DeliveryPersonStatus.EM_EMERGENCIA,
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: now,
      },
    });

    // Registrar evento
    await prisma.eventLog.create({
      data: {
        userId: user.id,
        orderId: user.activeOrderId,
        eventType: EventType.PANICO_ACIONADO,
        details: JSON.stringify({
          alertId: alert.id,
          reason: reason || 'Botão de pânico acionado',
        }),
        latitude,
        longitude,
      },
    });

    // Se tiver pedido ativo, notificar cliente (futuro: push notification)
    if (user.activeOrderId) {
      const order = await prisma.order.findUnique({
        where: { id: user.activeOrderId },
        select: {
          id: true,
          client: { select: { id: true, name: true, phone: true } },
        },
      });

      // Criar log para o cliente também
      if (order) {
        await prisma.eventLog.create({
          data: {
            userId: order.client.id,
            orderId: order.id,
            eventType: EventType.PANICO_ACIONADO,
            details: JSON.stringify({
              alertId: alert.id,
              deliveryPersonName: user.name,
              message: 'Entregador acionou botão de emergência',
            }),
            latitude,
            longitude,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      alertId: alert.id,
      message: 'Alerta de emergência enviado! Administradores foram notificados.',
    });
  } catch (error) {
    console.error('Erro ao acionar pânico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Resolver emergência (cancelar pânico)
export async function DELETE(request: NextRequest) {
  try {
    const authUser2 = await getAuthUser(request);
    if (!authUser2?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser2.id },
      select: {
        id: true,
        role: true,
        deliveryStatus: true,
        activeOrderId: true,
      },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores' }, { status: 403 });
    }

    if (user.deliveryStatus !== DeliveryPersonStatus.EM_EMERGENCIA) {
      return NextResponse.json({ error: 'Você não está em emergência' }, { status: 400 });
    }

    const { latitude, longitude } = await request.json();

    // Resolver alerta mais recente
    const alert = await prisma.emergencyAlert.findFirst({
      where: {
        userId: user.id,
        isResolved: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (alert) {
      await prisma.emergencyAlert.update({
        where: { id: alert.id },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: user.id,
          resolutionNotes: 'Resolvido pelo próprio entregador',
        },
      });
    }

    // Atualizar status - voltar para ONLINE ou status anterior
    const newStatus = user.activeOrderId
      ? DeliveryPersonStatus.EM_ROTA_COLETA
      : DeliveryPersonStatus.ONLINE;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        deliveryStatus: newStatus,
      },
    });

    // Registrar evento
    await prisma.eventLog.create({
      data: {
        userId: user.id,
        orderId: user.activeOrderId,
        eventType: EventType.PANICO_RESOLVIDO,
        details: JSON.stringify({
          alertId: alert?.id,
          resolvedBy: 'entregador',
        }),
        latitude,
        longitude,
      },
    });

    return NextResponse.json({
      success: true,
      newStatus,
      message: 'Emergência cancelada.',
    });
  } catch (error) {
    console.error('Erro ao cancelar pânico:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
