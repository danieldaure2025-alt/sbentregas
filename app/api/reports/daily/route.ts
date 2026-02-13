import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Buscar relatórios diários
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Admin pode ver todos, outros vêem apenas os próprios
    const targetUserId = session.user.role === UserRole.ADMIN && userId
      ? userId
      : session.user.id;

    const where: any = {
      userId: targetUserId,
    };

    if (startDate || endDate) {
      where.reportDate = {};
      if (startDate) where.reportDate.gte = new Date(startDate);
      if (endDate) where.reportDate.lte = new Date(endDate);
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, establishmentName: true },
        },
      },
    });

    // Calcular totais
    const totals = reports.reduce(
      (acc, report) => ({
        totalOrders: acc.totalOrders + report.totalOrders,
        totalRevenue: acc.totalRevenue + report.totalRevenue,
        platformFees: acc.platformFees + report.platformFees,
        deliveryFees: acc.deliveryFees + report.deliveryFees,
        netAmount: acc.netAmount + report.netAmount,
      }),
      { totalOrders: 0, totalRevenue: 0, platformFees: 0, deliveryFees: 0, netAmount: 0 }
    );

    return NextResponse.json({ reports, totals });
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar relatórios' },
      { status: 500 }
    );
  }
}

// POST - Gerar relatório diário (admin ou cron job)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Permitir chamada sem sessão (para cron jobs) com header especial
    const cronSecret = request.headers.get('x-cron-secret');
    const isValidCron = cronSecret === process.env.CRON_SECRET;

    if (!isValidCron && (!session?.user?.id || session.user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { date, userId } = await request.json();
    const reportDate = date ? new Date(date) : new Date();
    reportDate.setHours(0, 0, 0, 0);

    // Se userId específico, gerar apenas para ele; senão, gerar para todos estabelecimentos
    const establishments = userId
      ? await prisma.user.findMany({ where: { id: userId } })
      : await prisma.user.findMany({ where: { role: UserRole.ESTABLISHMENT } });

    const reports = [];

    for (const establishment of establishments) {
      // Buscar pedidos do dia
      const startOfDay = new Date(reportDate);
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: {
          establishmentId: establishment.id,
          status: 'DELIVERED',
          completedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          transactions: true,
        },
      });

      if (orders.length === 0) continue;

      const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);
      const platformFees = orders.reduce(
        (sum, o) => sum + (o.transactions[0]?.platformFee || 0),
        0
      );
      const deliveryFees = orders.reduce(
        (sum, o) => sum + (o.transactions[0]?.deliveryFee || 0),
        0
      );
      const netAmount = totalRevenue - platformFees;

      // Criar ou atualizar relatório
      const report = await prisma.dailyReport.upsert({
        where: {
          userId_reportDate: {
            userId: establishment.id,
            reportDate,
          },
        },
        update: {
          totalOrders: orders.length,
          totalRevenue,
          platformFees,
          deliveryFees,
          netAmount,
          orderIds: orders.map(o => o.id),
        },
        create: {
          userId: establishment.id,
          reportDate,
          totalOrders: orders.length,
          totalRevenue,
          platformFees,
          deliveryFees,
          netAmount,
          orderIds: orders.map(o => o.id),
        },
      });

      reports.push(report);
    }

    return NextResponse.json({
      success: true,
      reportsGenerated: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Error generating daily reports:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatórios' },
      { status: 500 }
    );
  }
}
