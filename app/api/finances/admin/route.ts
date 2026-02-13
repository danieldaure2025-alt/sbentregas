import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, PaymentStatus, OrderStatus, WithdrawalStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Admin financial overview
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
    const period = url.searchParams.get('period') || 'month';

    let startDate = new Date();
    if (period === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date(0);
    }

    // All transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        paymentStatus: PaymentStatus.COMPLETED,
        createdAt: { gte: startDate },
      },
      include: {
        order: {
          include: {
            client: { select: { name: true, email: true } },
            deliveryPerson: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalPlatformFees = transactions.reduce((sum, t) => sum + t.platformFee, 0);
    const totalDeliveryFees = transactions.reduce((sum, t) => sum + t.deliveryFee, 0);

    // Orders by status
    const orderStats = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      where: { createdAt: { gte: startDate } },
    });

    // Payment methods breakdown
    const paymentMethods = await prisma.order.groupBy({
      by: ['paymentMethod'],
      _count: true,
      _sum: { price: true },
      where: {
        createdAt: { gte: startDate },
        status: { not: OrderStatus.CANCELLED },
      },
    });

    // Pending withdrawals
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: { status: WithdrawalStatus.PENDING },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // All withdrawals for history
    const allWithdrawals = await prisma.withdrawal.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Total withdrawn
    const totalWithdrawn = await prisma.withdrawal.aggregate({
      _sum: { amount: true },
      where: {
        status: { in: [WithdrawalStatus.COMPLETED, WithdrawalStatus.APPROVED] },
        createdAt: { gte: startDate },
      },
    });

    // Top delivery persons
    const topDeliveryPersons = await prisma.order.groupBy({
      by: ['deliveryPersonId'],
      _count: true,
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: startDate },
        deliveryPersonId: { not: null },
      },
      orderBy: { _count: { deliveryPersonId: 'desc' } },
      take: 10,
    });

    // Get delivery person details
    const deliveryPersonIds = topDeliveryPersons
      .map((dp) => dp.deliveryPersonId)
      .filter((id): id is string => id !== null);

    const deliveryPersons = await prisma.user.findMany({
      where: { id: { in: deliveryPersonIds } },
      select: { id: true, name: true, email: true, rating: true },
    });

    const topDeliveryPersonsWithDetails = topDeliveryPersons.map((dp) => {
      const user = deliveryPersons.find((u) => u.id === dp.deliveryPersonId);
      return {
        ...dp,
        user,
      };
    });

    return NextResponse.json({
      totalRevenue,
      totalPlatformFees,
      totalDeliveryFees,
      totalWithdrawn: totalWithdrawn._sum.amount || 0,
      transactionsCount: transactions.length,
      orderStats,
      paymentMethods,
      pendingWithdrawals,
      allWithdrawals,
      topDeliveryPersons: topDeliveryPersonsWithDetails,
      recentTransactions: transactions.slice(0, 20),
    });
  } catch (error) {
    console.error('Error fetching admin finances:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados financeiros' },
      { status: 500 }
    );
  }
}
