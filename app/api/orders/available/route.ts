import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET available orders for delivery persons
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (user.role !== UserRole.DELIVERY_PERSON && user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Get pending orders (not assigned to anyone)
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        deliveryPersonId: null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos disponíveis' },
      { status: 500 }
    );
  }
}
