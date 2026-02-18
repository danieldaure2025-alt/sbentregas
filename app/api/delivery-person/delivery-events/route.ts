import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isWithinRadius, GEO_CONSTANTS } from '@/lib/geo-utils';
import { DeliveryPersonStatus, EventType, OrderStatus } from '@prisma/client';

// POST - Registrar eventos de entrega (chegada coleta, saída, chegada entrega, finalizar)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    if (!user.activeOrderId) {
      return NextResponse.json({ error: 'Nenhum pedido ativo' }, { status: 400 });
    }

    const { eventType, latitude, longitude, accuracy, photo, pin } = await request.json();

    if (!eventType || !latitude || !longitude) {
      return NextResponse.json({ error: 'eventType, latitude e longitude são obrigatórios' }, { status: 400 });
    }

    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: user.activeOrderId },
      select: {
        id: true,
        status: true,
        originLatitude: true,
        originLongitude: true,
        destinationLatitude: true,
        destinationLongitude: true,
        price: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const now = new Date();
    let newOrderStatus: OrderStatus | null = null;
    let newDeliveryStatus: DeliveryPersonStatus | null = null;
    let locationValidated = true;
    let validationMessage = '';

    switch (eventType) {
      case 'CHEGADA_COLETA':
        // Validar localização (100m do ponto de coleta)
        if (order.originLatitude && order.originLongitude) {
          const isNearPickup = isWithinRadius(
            latitude, longitude,
            order.originLatitude, order.originLongitude,
            GEO_CONSTANTS.ARRIVAL_RADIUS_METERS
          );
          if (!isNearPickup) {
            locationValidated = false;
            validationMessage = 'Você não está próximo o suficiente do local de coleta (100m)';
          }
        }
        newOrderStatus = OrderStatus.PICKED_UP;
        break;

      case 'SAIDA_COLETA':
        newOrderStatus = OrderStatus.IN_TRANSIT;
        newDeliveryStatus = DeliveryPersonStatus.EM_ROTA_ENTREGA;
        break;

      case 'CHEGADA_ENTREGA':
        // Validar localização (100m do ponto de entrega)
        if (order.destinationLatitude && order.destinationLongitude) {
          const isNearDelivery = isWithinRadius(
            latitude, longitude,
            order.destinationLatitude, order.destinationLongitude,
            GEO_CONSTANTS.ARRIVAL_RADIUS_METERS
          );
          if (!isNearDelivery) {
            locationValidated = false;
            validationMessage = 'Você não está próximo o suficiente do local de entrega (100m)';
          }
        }
        break;

      case 'ENTREGA_FINALIZADA':
        newOrderStatus = OrderStatus.DELIVERED;
        newDeliveryStatus = DeliveryPersonStatus.ONLINE;
        break;

      default:
        return NextResponse.json({ error: 'Tipo de evento inválido' }, { status: 400 });
    }

    // Registrar evento (mesmo se localização não validada, para auditoria)
    await prisma.eventLog.create({
      data: {
        userId: user.id,
        orderId: order.id,
        eventType: eventType as EventType,
        details: JSON.stringify({
          locationValidated,
          validationMessage,
          accuracy,
          photo: photo || null,
          pin: pin || null,
        }),
        latitude,
        longitude,
        accuracy,
      },
    });

    // Se localização não validada, retornar aviso mas não bloquear
    // (Em produção pode-se decidir bloquear)
    if (!locationValidated) {
      return NextResponse.json({ 
        success: true, 
        warning: validationMessage,
        locationValidated: false,
      });
    }

    // Atualizar pedido se necessário
    if (newOrderStatus) {
      const updateData: Record<string, unknown> = { status: newOrderStatus };
      
      if (newOrderStatus === OrderStatus.PICKED_UP) {
        updateData.pickedUpAt = now;
      } else if (newOrderStatus === OrderStatus.IN_TRANSIT) {
        updateData.inTransitAt = now;
      } else if (newOrderStatus === OrderStatus.DELIVERED) {
        updateData.completedAt = now;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });
    }

    // Atualizar entregador se necessário
    if (newDeliveryStatus) {
      const deliveryUpdate: Record<string, unknown> = { 
        deliveryStatus: newDeliveryStatus,
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: now,
      };

      // Se finalizou entrega, limpar pedido ativo e incrementar total
      if (newDeliveryStatus === DeliveryPersonStatus.ONLINE) {
        deliveryUpdate.activeOrderId = null;
        deliveryUpdate.totalDeliveries = { increment: 1 };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: deliveryUpdate,
      });
    }

    // Salvar localização no histórico
    await prisma.locationLog.create({
      data: {
        userId: user.id,
        orderId: order.id,
        latitude,
        longitude,
        accuracy,
      },
    });

    return NextResponse.json({ 
      success: true,
      eventType,
      newOrderStatus,
      newDeliveryStatus,
      locationValidated: true,
    });
  } catch (error) {
    console.error('Erro ao registrar evento de entrega:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
