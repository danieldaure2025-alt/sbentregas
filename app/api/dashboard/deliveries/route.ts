import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Acesso permitido apenas para administradores' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};

    if (status !== 'all') {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          deliveryPerson: { select: { id: true, name: true, email: true, phone: true, rating: true } },
          transactions: { select: { paymentStatus: true, paymentMethod: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Get stats
    const stats = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusCounts = stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        awaitingPayment: statusCounts[OrderStatus.AWAITING_PAYMENT] || 0,
        pending: statusCounts[OrderStatus.PENDING] || 0,
        accepted: statusCounts[OrderStatus.ACCEPTED] || 0,
        pickedUp: statusCounts[OrderStatus.PICKED_UP] || 0,
        inTransit: statusCounts[OrderStatus.IN_TRANSIT] || 0,
        delivered: statusCounts[OrderStatus.DELIVERED] || 0,
        cancelled: statusCounts[OrderStatus.CANCELLED] || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar entregas' },
      { status: 500 }
    );
  }
}
