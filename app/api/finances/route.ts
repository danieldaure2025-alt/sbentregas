import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Buscar saldo e histórico financeiro do entregador
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DELIVERY_PERSON) {
      return NextResponse.json(
        { error: 'Acesso permitido apenas para entregadores' },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'month';
    const customStart = url.searchParams.get('startDate');
    const customEnd = url.searchParams.get('endDate');

    // Calcular data de início baseado no período
    let startDate = new Date();
    let endDate = new Date();
    if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'day') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate = new Date(0); // all time
    }

    const dateFilter = period === 'custom' ? { gte: startDate, lte: endDate } : { gte: startDate };

    // Buscar entregas completadas
    const deliveries = await prisma.order.findMany({
      where: {
        deliveryPersonId: userId,
        status: OrderStatus.DELIVERED,
        completedAt: dateFilter,
      },
      include: {
        transactions: {
          where: { paymentStatus: PaymentStatus.COMPLETED },
        },
      },
      orderBy: { completedAt: 'desc' },
    });

    // Calcular ganhos totais do período
    const totalEarnings = deliveries.reduce((sum, order) => {
      const tx = order.transactions[0];
      return sum + (tx?.deliveryFee || 0);
    }, 0);

    // Buscar saques já realizados no período
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
        createdAt: dateFilter,
      },
      orderBy: { createdAt: 'desc' },
    });

    const withdrawnAmount = withdrawals
      .filter((w) => w.status === 'COMPLETED' || w.status === 'APPROVED')
      .reduce((sum, w) => sum + w.amount, 0);

    const pendingWithdrawal = withdrawals
      .filter((w) => w.status === 'PENDING')
      .reduce((sum, w) => sum + w.amount, 0);

    // Saldo disponível = ganhos - saques completados - saques pendentes
    const availableBalance = totalEarnings - withdrawnAmount - pendingWithdrawal;

    // Buscar dados bancários do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pixKeyType: true,
        pixKey: true,
        bankCode: true,
        bankName: true,
        agencyNumber: true,
        accountNumber: true,
        accountType: true,
        accountHolder: true,
        cpfCnpj: true,
      },
    });

    return NextResponse.json({
      totalEarnings,
      availableBalance,
      withdrawnAmount,
      pendingWithdrawal,
      deliveriesCount: deliveries.length,
      deliveries: deliveries.slice(0, 20).map((d) => ({
        id: d.id,
        originAddress: d.originAddress,
        destinationAddress: d.destinationAddress,
        completedAt: d.completedAt,
        deliveryFee: d.transactions[0]?.deliveryFee || 0,
      })),
      withdrawals: withdrawals.slice(0, 10),
      bankData: user,
    });
  } catch (error) {
    console.error('Error fetching finances:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados financeiros' },
      { status: 500 }
    );
  }
}
