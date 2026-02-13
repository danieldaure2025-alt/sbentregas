import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET single order
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const orderId = params.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isClient = session.user.id === order.clientId;
    const isDeliveryPerson = session.user.id === order.deliveryPersonId;

    if (!isAdmin && !isClient && !isDeliveryPerson) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedido' },
      { status: 500 }
    );
  }
}
