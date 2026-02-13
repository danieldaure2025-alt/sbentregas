import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus, UserStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// POST accept order (DELIVERY_PERSON only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DELIVERY_PERSON) {
      return NextResponse.json(
        { error: 'Apenas entregadores podem aceitar pedidos' },
        { status: 403 }
      );
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      return NextResponse.json(
        { error: 'Sua conta precisa estar ativa para aceitar pedidos' },
        { status: 403 }
      );
    }

    const orderId = params.id;

    // Check if order exists and is available
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    if (order.status !== OrderStatus.PENDING) {
      return NextResponse.json(
        { error: 'Este pedido não está mais disponível' },
        { status: 400 }
      );
    }

    if (order.deliveryPersonId) {
      return NextResponse.json(
        { error: 'Este pedido já foi aceito por outro entregador' },
        { status: 400 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryPersonId: session.user.id,
        status: OrderStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      orderId: order.id,
      action: 'ORDER_ACCEPTED',
      details: `Order accepted by delivery person ${session.user.id}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      order: updatedOrder,
      message: 'Pedido aceito com sucesso!',
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    return NextResponse.json(
      { error: 'Erro ao aceitar pedido' },
      { status: 500 }
    );
  }
}
