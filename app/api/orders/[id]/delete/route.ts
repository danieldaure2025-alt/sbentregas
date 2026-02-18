import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// DELETE - Delete an order (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir pedidos' },
        { status: 403 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, email: true } },
        transactions: true,
        rating: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    // Delete related records first
    if (order.rating) {
      await prisma.rating.delete({ where: { orderId: id } });
    }

    if (order.transactions.length > 0) {
      await prisma.transaction.deleteMany({ where: { orderId: id } });
    }

    // Delete audit logs
    await prisma.auditLog.deleteMany({ where: { orderId: id } });

    // Delete the order
    await prisma.order.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      action: 'ORDER_DELETED',
      details: `Pedido #${id.slice(-6)} excluído. Cliente: ${order.client.name || order.client.email}. Valor: R$ ${order.price.toFixed(2)}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Pedido excluído com sucesso',
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir pedido' },
      { status: 500 }
    );
  }
}
