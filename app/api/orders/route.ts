import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, UserStatus, OrderStatus, PaymentMethod, PaymentStatus, DeliveryPersonStatus } from '@prisma/client';
import { calculateOrderPrice, geocodeAddress, calculateRouteDistance } from '@/lib/price-calculator';
import { createAuditLog } from '@/lib/audit-logger';
import { sendNewOrderNotification } from '@/lib/firebase-admin';
import { haversineDistance, GEO_CONSTANTS } from '@/lib/geo-utils';

export const dynamic = 'force-dynamic';

// GET orders
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    const where: any = {};

    // Apply filters based on role
    if (session.user.role === UserRole.CLIENT) {
      where.clientId = session.user.id;
    } else if (session.user.role === UserRole.DELIVERY_PERSON) {
      where.deliveryPersonId = session.user.id;
    }
    // ADMIN can see all orders (no filter)

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            rating: true,
          },
        },
        transactions: true,
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
}

// POST create order (CLIENT only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json(
        { error: 'Apenas clientes podem criar pedidos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { originAddress, destinationAddress, notes, paymentMethod, scheduledAt } = body;

    if (!originAddress || !destinationAddress) {
      return NextResponse.json(
        { error: 'Endereços de origem e destino são obrigatórios' },
        { status: 400 }
      );
    }

    // Calcular distância real usando Mapbox
    const originCoords = await geocodeAddress(originAddress);
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
        { error: 'Não foi possível calcular a rota entre os endereços' },
        { status: 400 }
      );
    }

    const { distance } = routeData;

    // Calculate price
    const { price, platformFee, deliveryFee } = await calculateOrderPrice(distance);

    // Determinar status inicial baseado no método de pagamento
    // CASH, END_OF_DAY, ON_DELIVERY, INVOICED: PENDING (disponível para entregadores)
    // PIX e CREDIT_CARD: AWAITING_PAYMENT (aguardando confirmação de pagamento)
    const directPaymentMethods = ['CASH', 'END_OF_DAY', 'ON_DELIVERY', 'INVOICED'];
    const initialStatus = directPaymentMethods.includes(paymentMethod)
      ? OrderStatus.PENDING
      : OrderStatus.AWAITING_PAYMENT;

    // Validar método de pagamento
    const validPaymentMethods = ['CREDIT_CARD', 'PIX', 'DEBIT_CARD', 'CASH', 'END_OF_DAY', 'ON_DELIVERY', 'INVOICED'];
    const selectedPaymentMethod = validPaymentMethods.includes(paymentMethod)
      ? paymentMethod as PaymentMethod
      : PaymentMethod.CREDIT_CARD;

    // Scheduling
    const isScheduled = !!scheduledAt;
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;

    // Create order with coordinates (Coordinates format: [longitude, latitude])
    const order = await prisma.order.create({
      data: {
        clientId: session.user.id,
        originAddress,
        originLatitude: originCoords[1],
        originLongitude: originCoords[0],
        destinationAddress,
        destinationLatitude: destCoords[1],
        destinationLongitude: destCoords[0],
        notes,
        distance: Number(distance.toFixed(2)),
        price,
        paymentMethod: selectedPaymentMethod,
        status: initialStatus,
        isScheduled,
        scheduledAt: scheduledDate,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Para CASH, END_OF_DAY, ON_DELIVERY e INVOICED, criar Transaction como PENDING
    if (directPaymentMethods.includes(paymentMethod)) {
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          totalAmount: price,
          platformFee,
          deliveryFee,
          paymentMethod: selectedPaymentMethod,
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    }

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      orderId: order.id,
      action: 'ORDER_CREATED',
      details: `Order created with price R$ ${price}, payment method: ${selectedPaymentMethod}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    // Se o pedido está PENDING, disparar oferta e notificações push para entregadores
    if (initialStatus === OrderStatus.PENDING) {
      try {
        // Detectar a URL base dinamicamente a partir do request
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
        const proto = req.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = `${proto}://${host}`;

        // Chamar a API de ofertas internamente
        const offerResponse = await fetch(`${baseUrl}/api/orders/offer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });
        const offerData = await offerResponse.json();
        console.log('Offer dispatched:', offerData);
      } catch (offerError) {
        console.error('Error dispatching offer:', offerError);
        // Não falhar a criação do pedido se a oferta falhar
      }

      // Enviar notificações push para entregadores online E PRÓXIMOS ao local de coleta
      try {
        const onlineDeliveryPersons = await prisma.user.findMany({
          where: {
            role: UserRole.DELIVERY_PERSON,
            status: UserStatus.ACTIVE,
            fcmToken: { not: null },
            currentLatitude: { not: null },
            currentLongitude: { not: null },
            OR: [
              { isOnline: true },
              { deliveryStatus: DeliveryPersonStatus.ONLINE },
            ],
          },
          select: {
            fcmToken: true,
            currentLatitude: true,
            currentLongitude: true,
            name: true,
          },
        });

        // Filtrar entregadores por proximidade (dentro do raio máximo de coleta)
        const nearbyDeliveryPersons = onlineDeliveryPersons.filter(dp => {
          if (!dp.currentLatitude || !dp.currentLongitude) return false;

          const distanceToPickup = haversineDistance(
            dp.currentLatitude,
            dp.currentLongitude,
            originCoords[1], // latitude
            originCoords[0]  // longitude
          );

          console.log(`Entregador ${dp.name}: ${distanceToPickup.toFixed(2)}km do ponto de coleta`);
          return distanceToPickup <= GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM;
        });

        const fcmTokens = nearbyDeliveryPersons
          .map(dp => dp.fcmToken)
          .filter((token): token is string => token !== null);

        console.log(`Entregadores online: ${onlineDeliveryPersons.length}, Próximos (${GEO_CONSTANTS.MAX_PICKUP_DISTANCE_KM}km): ${nearbyDeliveryPersons.length}`);

        if (fcmTokens.length > 0) {
          const pushResult = await sendNewOrderNotification(fcmTokens, {
            orderId: order.id,
            originAddress: order.originAddress,
            destinationAddress: order.destinationAddress,
            price: order.price,
            distance: order.distance || 0,
          });
          console.log(`Push notifications sent: ${pushResult.successCount} success, ${pushResult.failureCount} failures`);
        } else {
          console.log('Nenhum entregador próximo encontrado para notificar');
        }
      } catch (pushError) {
        console.error('Error sending push notifications:', pushError);
        // Não falhar a criação do pedido se o push falhar
      }
    }

    return NextResponse.json(
      {
        order,
        message: 'Pedido criado com sucesso!',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}
