import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { detectFakeGps, GEO_CONSTANTS } from '@/lib/geo-utils';
import { DeliveryPersonStatus, EventType } from '@prisma/client';

// POST - Atualizar localização do entregador (a cada 3 segundos)
export async function POST(request: NextRequest) {
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
        deliveryStatus: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
        activeOrderId: true,
      },
    });

    if (!user || user.role !== 'DELIVERY_PERSON') {
      return NextResponse.json({ error: 'Apenas entregadores podem atualizar localização' }, { status: 403 });
    }

    // Só rastrear se estiver em status ativo
    const activeStatuses: DeliveryPersonStatus[] = ['ONLINE', 'EM_ROTA_COLETA', 'EM_ROTA_ENTREGA', 'EM_EMERGENCIA'];
    if (!activeStatuses.includes(user.deliveryStatus)) {
      return NextResponse.json({ error: 'Entregador está offline' }, { status: 400 });
    }

    const { latitude, longitude, accuracy, speed, heading } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude e longitude são obrigatórios' }, { status: 400 });
    }

    const now = new Date();

    // Detectar GPS falso
    const fakeGpsCheck = detectFakeGps(
      user.currentLatitude,
      user.currentLongitude,
      user.lastLocationUpdate,
      latitude,
      longitude,
      now
    );

    // Se GPS falso detectado, registrar evento
    if (fakeGpsCheck.isFake) {
      await prisma.eventLog.create({
        data: {
          userId: user.id,
          orderId: user.activeOrderId,
          eventType: EventType.GPS_FALSO_DETECTADO,
          details: fakeGpsCheck.reason,
          latitude,
          longitude,
          accuracy,
        },
      });

      // Não atualizar posição se GPS falso
      return NextResponse.json({
        success: false,
        warning: 'GPS possivelmente falsificado',
        reason: fakeGpsCheck.reason
      }, { status: 200 });
    }

    // Atualizar posição atual do entregador
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: now,
        lastOnlineAt: now,
      },
    });

    // Se estiver em rota (com pedido), salvar histórico completo
    const routeStatuses: DeliveryPersonStatus[] = ['EM_ROTA_COLETA', 'EM_ROTA_ENTREGA', 'EM_EMERGENCIA'];
    if (routeStatuses.includes(user.deliveryStatus) && user.activeOrderId) {
      await prisma.locationLog.create({
        data: {
          userId: user.id,
          orderId: user.activeOrderId,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          isFakeGps: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      trackingInterval: GEO_CONSTANTS.TRACKING_INTERVAL_MS,
    });
  } catch (error) {
    console.error('Erro ao atualizar localização:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
