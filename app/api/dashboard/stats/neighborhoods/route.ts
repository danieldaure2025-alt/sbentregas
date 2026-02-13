import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

function extractNeighborhood(address: string): string {
  // Try to extract neighborhood from address
  // Usually in format: "Street, Number - Neighborhood, City - State"
  const parts = address.split(',');
  if (parts.length >= 2) {
    // Try to get the part after the hyphen
    const lastPart = parts[parts.length - 2]?.trim() || '';
    const neighborhood = lastPart.split('-')[0]?.trim();
    if (neighborhood && neighborhood.length > 2) {
      return neighborhood;
    }
  }
  // If can't extract, use first meaningful part
  const firstPart = parts[0]?.trim() || 'Desconhecido';
  return firstPart.slice(0, 30);
}

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

    // Get all orders within period
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      include: {
        deliveryPerson: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
    });

    // Group by origin neighborhood
    const neighborhoodStats: Record<string, {
      name: string;
      totalOrders: number;
      delivered: number;
      cancelled: number;
      pending: number;
      inProgress: number;
      problem: number;
      totalRevenue: number;
      deliveryPersons: Set<string>;
    }> = {};

    orders.forEach((order) => {
      const neighborhood = extractNeighborhood(order.originAddress);
      
      if (!neighborhoodStats[neighborhood]) {
        neighborhoodStats[neighborhood] = {
          name: neighborhood,
          totalOrders: 0,
          delivered: 0,
          cancelled: 0,
          pending: 0,
          inProgress: 0,
          problem: 0,
          totalRevenue: 0,
          deliveryPersons: new Set(),
        };
      }

      const stat = neighborhoodStats[neighborhood];
      stat.totalOrders++;
      stat.totalRevenue += order.price;

      if (order.deliveryPerson) {
        stat.deliveryPersons.add(order.deliveryPerson.name || order.deliveryPerson.email);
      }

      switch (order.status) {
        case OrderStatus.DELIVERED:
          stat.delivered++;
          break;
        case OrderStatus.CANCELLED:
          stat.cancelled++;
          break;
        case OrderStatus.PENDING:
        case OrderStatus.AWAITING_PAYMENT:
          stat.pending++;
          break;
        case OrderStatus.ACCEPTED:
        case OrderStatus.PICKED_UP:
        case OrderStatus.IN_TRANSIT:
          stat.inProgress++;
          break;
      }
    });

    // Convert to array and calculate percentages
    const stats = Object.values(neighborhoodStats)
      .map((stat) => ({
        name: stat.name,
        totalOrders: stat.totalOrders,
        delivered: stat.delivered,
        cancelled: stat.cancelled,
        pending: stat.pending,
        inProgress: stat.inProgress,
        totalRevenue: stat.totalRevenue,
        deliveredPercent: stat.totalOrders > 0 
          ? Math.round((stat.delivered / stat.totalOrders) * 100) 
          : 0,
        cancelledPercent: stat.totalOrders > 0 
          ? Math.round((stat.cancelled / stat.totalOrders) * 100) 
          : 0,
        deliveryPersons: Array.from(stat.deliveryPersons),
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);

    // Global stats
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED).length;
    const cancelledOrders = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;
    const inProgressOrders = orders.filter((o) => 
      o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.PICKED_UP || o.status === OrderStatus.IN_TRANSIT
    ).length;

    return NextResponse.json({
      neighborhoods: stats,
      summary: {
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        inProgressOrders,
        deliveredPercent: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
        cancelledPercent: totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching neighborhood stats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
