import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Get all pending end-of-day billings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Get all clients with end of day billing enabled
    const clientsWithEOD = await prisma.user.findMany({
      where: {
        role: UserRole.CLIENT,
        endOfDayBilling: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        ordersAsClient: {
          where: {
            paymentMethod: PaymentMethod.END_OF_DAY,
            status: { in: [OrderStatus.DELIVERED, OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT] },
            transactions: {
              some: {
                paymentStatus: PaymentStatus.PENDING,
              },
            },
          },
          include: {
            transactions: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Calculate totals for each client
    const clientsWithTotals = clientsWithEOD.map(client => {
      const pendingOrders = client.ordersAsClient;
      const totalAmount = pendingOrders.reduce((sum, order) => sum + order.price, 0);
      
      return {
        ...client,
        pendingOrders,
        totalAmount,
        orderCount: pendingOrders.length,
      };
    }).filter(client => client.orderCount > 0);

    const totalPendingAmount = clientsWithTotals.reduce((sum, client) => sum + client.totalAmount, 0);
    const totalPendingOrders = clientsWithTotals.reduce((sum, client) => sum + client.orderCount, 0);

    return NextResponse.json({
      clients: clientsWithTotals,
      stats: {
        totalClients: clientsWithTotals.length,
        totalPendingAmount,
        totalPendingOrders,
      },
    });
  } catch (error) {
    console.error('Error fetching end-of-day billings:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cobranças' },
      { status: 500 }
    );
  }
}

// POST - Send billing to a specific client
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { clientId, markAsPaid } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 });
    }

    // Get all pending orders for this client
    const pendingOrders = await prisma.order.findMany({
      where: {
        clientId,
        paymentMethod: PaymentMethod.END_OF_DAY,
        transactions: {
          some: {
            paymentStatus: PaymentStatus.PENDING,
          },
        },
      },
      include: {
        transactions: true,
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (pendingOrders.length === 0) {
      return NextResponse.json({ error: 'Nenhum pedido pendente encontrado' }, { status: 404 });
    }

    const totalAmount = pendingOrders.reduce((sum, order) => sum + order.price, 0);

    if (markAsPaid) {
      // Mark all transactions as paid
      await prisma.$transaction(
        pendingOrders.flatMap(order =>
          order.transactions.map(tx =>
            prisma.transaction.update({
              where: { id: tx.id },
              data: { paymentStatus: PaymentStatus.COMPLETED },
            })
          )
        )
      );

      return NextResponse.json({
        success: true,
        message: `${pendingOrders.length} pedidos marcados como pagos. Total: R$ ${totalAmount.toFixed(2)}`,
        ordersCount: pendingOrders.length,
        totalAmount,
      });
    }

    // Generate billing summary (for now, just return the data - could send email in the future)
    return NextResponse.json({
      success: true,
      client: pendingOrders[0].client,
      orders: pendingOrders.map(o => ({
        id: o.id,
        price: o.price,
        originAddress: o.originAddress,
        destinationAddress: o.destinationAddress,
        createdAt: o.createdAt,
      })),
      totalAmount,
      message: `Cobrança gerada: ${pendingOrders.length} pedidos, total R$ ${totalAmount.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error processing end-of-day billing:', error);
    return NextResponse.json(
      { error: 'Erro ao processar cobrança' },
      { status: 500 }
    );
  }
}
