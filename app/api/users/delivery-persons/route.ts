import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, UserStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Get all delivery persons with their online status and location (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const deliveryPersons = await prisma.user.findMany({
      where: {
        role: UserRole.DELIVERY_PERSON,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        vehicleType: true,
        rating: true,
        totalDeliveries: true,
        isOnline: true,
        lastOnlineAt: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
        ordersAsDeliveryPerson: {
          where: {
            status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
          },
          select: {
            id: true,
            status: true,
            originAddress: true,
            destinationAddress: true,
          },
        },
      },
      orderBy: [
        { isOnline: 'desc' },
        { lastOnlineAt: 'desc' },
      ],
    });

    const onlineCount = deliveryPersons.filter(p => p.isOnline).length;
    const offlineCount = deliveryPersons.filter(p => !p.isOnline).length;
    const busyCount = deliveryPersons.filter(p => p.ordersAsDeliveryPerson.length > 0).length;

    return NextResponse.json({
      deliveryPersons,
      stats: {
        total: deliveryPersons.length,
        online: onlineCount,
        offline: offlineCount,
        busy: busyCount,
        available: onlineCount - busyCount,
      },
    });
  } catch (error) {
    console.error('Error fetching delivery persons:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar entregadores' },
      { status: 500 }
    );
  }
}
