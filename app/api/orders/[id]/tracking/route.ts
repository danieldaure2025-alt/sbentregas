import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Get delivery person location for an order
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
            currentLatitude: true,
            currentLongitude: true,
            lastLocationUpdate: true,
          },
        },
        client: { select: { id: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Check permission
    const isOwner = order.clientId === session.user.id;
    const isDeliveryPerson = order.deliveryPersonId === session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    if (!isOwner && !isDeliveryPerson && !isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Only show location for active deliveries
    const isActiveDelivery = order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.PICKED_UP || order.status === OrderStatus.IN_TRANSIT;
    if (!isActiveDelivery) {
      return NextResponse.json({
        hasLocation: false,
        message: 'Rastreamento disponível apenas para entregas em andamento',
      });
    }

    if (!order.deliveryPerson) {
      return NextResponse.json({
        hasLocation: false,
        message: 'Aguardando entregador aceitar o pedido',
      });
    }

    if (!order.deliveryPerson.currentLatitude || !order.deliveryPerson.currentLongitude) {
      return NextResponse.json({
        hasLocation: false,
        message: 'Localização do entregador não disponível',
      });
    }

    return NextResponse.json({
      hasLocation: true,
      deliveryPerson: {
        name: order.deliveryPerson.name,
        phone: order.deliveryPerson.phone,
        latitude: order.deliveryPerson.currentLatitude,
        longitude: order.deliveryPerson.currentLongitude,
        lastUpdate: order.deliveryPerson.lastLocationUpdate,
      },
      orderStatus: order.status,
    });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar rastreamento' },
      { status: 500 }
    );
  }
}
