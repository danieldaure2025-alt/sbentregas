import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// PATCH update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status é obrigatório' },
        { status: 400 }
      );
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = user.role === UserRole.ADMIN;
    const isAssignedDeliveryPerson =
      user.role === UserRole.DELIVERY_PERSON &&
      user.id === order.deliveryPersonId;
    const isOrderClient =
      user.role === UserRole.CLIENT &&
      user.id === order.clientId;
    const isOrderEstablishment =
      user.role === UserRole.ESTABLISHMENT &&
      user.id === order.establishmentId;

    // Clients/Establishments can only cancel their orders
    if (isOrderClient || isOrderEstablishment) {
      if (status !== OrderStatus.CANCELLED) {
        return NextResponse.json(
          { error: 'Clientes só podem cancelar pedidos' },
          { status: 403 }
        );
      }
      // Can only cancel if order is in AWAITING_PAYMENT or PENDING status
      if (order.status !== OrderStatus.AWAITING_PAYMENT && order.status !== OrderStatus.PENDING) {
        return NextResponse.json(
          { error: 'Pedido já foi aceito e não pode ser cancelado' },
          { status: 400 }
        );
      }
    } else if (!isAdmin && !isAssignedDeliveryPerson) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Validate status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      AWAITING_PAYMENT: [OrderStatus.PENDING, OrderStatus.CANCELLED],
      PENDING: [OrderStatus.CANCELLED, OrderStatus.NO_COURIER_AVAILABLE],
      ACCEPTED: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
      PICKED_UP: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      IN_TRANSIT: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      DELIVERED: [], // Final state
      CANCELLED: [], // Final state
      NO_COURIER_AVAILABLE: [OrderStatus.PENDING], // Admin can retry distribution
    };

    const currentStatus = order.status;
    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!isAdmin && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Transição de ${currentStatus} para ${status} não é permitida`,
        },
        { status: 400 }
      );
    }

    // Prepare update data with timestamps
    const updateData: any = { status };

    if (status === OrderStatus.PICKED_UP) {
      updateData.pickedUpAt = new Date();
    } else if (status === OrderStatus.IN_TRANSIT) {
      updateData.inTransitAt = new Date();
    } else if (status === OrderStatus.DELIVERED) {
      updateData.completedAt = new Date();

      // Update delivery person stats
      if (order.deliveryPersonId) {
        const deliveryPerson = await prisma.user.findUnique({
          where: { id: order.deliveryPersonId },
        });

        if (deliveryPerson) {
          await prisma.user.update({
            where: { id: order.deliveryPersonId },
            data: {
              totalDeliveries: (deliveryPerson?.totalDeliveries ?? 0) + 1,
            },
          });
        }
      }
    } else if (status === OrderStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
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
        transactions: true,
      },
    });

    // Log the action
    await createAuditLog({
      userId: user.id,
      orderId: order.id,
      action: 'ORDER_STATUS_UPDATED',
      details: `Order status changed from ${currentStatus} to ${status}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      order: updatedOrder,
      message: 'Status atualizado com sucesso',
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status do pedido' },
      { status: 500 }
    );
  }
}

// Also export as PUT for mobile app compatibility
export { PATCH as PUT };
