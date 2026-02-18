import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { calculateOrderPrice, geocodeAddress, calculateRouteDistance } from '@/lib/price-calculator';
import { sendNewOrderNotification } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// GET - Listar pedidos do estabelecimento
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== UserRole.ESTABLISHMENT) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      establishmentId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        deliveryPerson: {
          select: { id: true, name: true, phone: true },
        },
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totais
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      inProgress: orders.filter(o => ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)).length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
      totalRevenue: orders
        .filter(o => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + o.price, 0),
    };

    return NextResponse.json({ orders, stats });
  } catch (error) {
    console.error('Error fetching establishment orders:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
}

// POST - Criar pedido como estabelecimento (origem fixa)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== UserRole.ESTABLISHMENT) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do estabelecimento
    const establishment = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        establishmentName: true,
        establishmentAddress: true,
        establishmentLatitude: true,
        establishmentLongitude: true,
        endOfDayBilling: true,
      },
    });

    if (!establishment?.establishmentAddress) {
      return NextResponse.json(
        { error: 'Configure o endereço do estabelecimento primeiro' },
        { status: 400 }
      );
    }

    const { destinationAddress, clientPhone, notes, clientName } = await request.json();

    if (!destinationAddress) {
      return NextResponse.json(
        { error: 'Endereço de destino é obrigatório' },
        { status: 400 }
      );
    }

    // Usar endereço do estabelecimento como origem
    const originCoords = establishment.establishmentLatitude && establishment.establishmentLongitude
      ? [establishment.establishmentLongitude, establishment.establishmentLatitude] as [number, number]
      : await geocodeAddress(establishment.establishmentAddress);

    const destCoords = await geocodeAddress(destinationAddress);

    if (!originCoords || !destCoords) {
      return NextResponse.json(
        { error: 'Não foi possível encontrar um ou ambos os endereços' },
        { status: 400 }
      );
    }

    const routeData = await calculateRouteDistance(originCoords, destCoords);
    
    if (!routeData) {
      return NextResponse.json(
        { error: 'Não foi possível calcular a rota' },
        { status: 400 }
      );
    }

    const { distance } = routeData;
    const { price, platformFee, deliveryFee } = await calculateOrderPrice(distance);

    // Estabelecimento sempre usa pagamento no final do dia
    const paymentMethod = PaymentMethod.END_OF_DAY;

    const order = await prisma.order.create({
      data: {
        clientId: session.user.id, // Estabelecimento é o "cliente" também
        establishmentId: session.user.id,
        originAddress: establishment.establishmentAddress,
        originLatitude: originCoords[1],
        originLongitude: originCoords[0],
        destinationAddress,
        destinationLatitude: destCoords[1],
        destinationLongitude: destCoords[0],
        clientPhone,
        notes: notes ? `${clientName ? `Cliente: ${clientName}\n` : ''}${notes}` : (clientName ? `Cliente: ${clientName}` : null),
        distance: Number(distance.toFixed(2)),
        price,
        paymentMethod,
        status: OrderStatus.PENDING,
      },
    });

    // Criar transação como PENDING
    await prisma.transaction.create({
      data: {
        orderId: order.id,
        totalAmount: price,
        platformFee,
        deliveryFee,
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // Notificar entregadores
    try {
      const onlineDeliveryPersons = await prisma.user.findMany({
        where: {
          role: UserRole.DELIVERY_PERSON,
          status: 'ACTIVE',
          fcmToken: { not: null },
          isOnline: true,
        },
        select: { fcmToken: true },
      });

      const fcmTokens = onlineDeliveryPersons
        .map(dp => dp.fcmToken)
        .filter((token): token is string => token !== null);

      if (fcmTokens.length > 0) {
        await sendNewOrderNotification(fcmTokens, {
          orderId: order.id,
          originAddress: establishment.establishmentAddress,
          destinationAddress,
          price,
          distance,
        });
      }
    } catch (pushError) {
      console.error('Error sending push notifications:', pushError);
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Error creating establishment order:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}
