import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus, UserStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole === UserRole.ADMIN) {
      // Admin stats
      const [totalOrders, activeOrders, completedOrders, totalUsers, activeDeliveryPersons, transactions] =
        await Promise.all([
          prisma.order.count(),
          prisma.order.count({
            where: {
              status: {
                in: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT],
              },
            },
          }),
          prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
          prisma.user.count(),
          prisma.user.count({
            where: {
              role: UserRole.DELIVERY_PERSON,
              status: UserStatus.ACTIVE,
            },
          }),
          prisma.transaction.findMany({
            where: { paymentStatus: 'COMPLETED' },
          }),
        ]);

      const totalRevenue = transactions.reduce(
        (sum, t) => sum + (t?.totalAmount ?? 0),
        0
      );
      const platformRevenue = transactions.reduce(
        (sum, t) => sum + (t?.platformFee ?? 0),
        0
      );

      return NextResponse.json({
        totalOrders,
        activeOrders,
        completedOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        platformRevenue: Number(platformRevenue.toFixed(2)),
        totalUsers,
        activeDeliveryPersons,
      });
    } else if (userRole === UserRole.CLIENT) {
      // Client stats
      const [totalOrders, activeOrders, completedOrders] = await Promise.all([
        prisma.order.count({ where: { clientId: userId } }),
        prisma.order.count({
          where: {
            clientId: userId,
            status: {
              in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT],
            },
          },
        }),
        prisma.order.count({
          where: {
            clientId: userId,
            status: OrderStatus.DELIVERED,
          },
        }),
      ]);

      const orders = await prisma.order.findMany({
        where: { clientId: userId },
        include: { transactions: true },
      });

      const totalSpent = orders.reduce(
        (sum, order) =>
          sum +
          (order?.transactions?.[0]?.totalAmount ?? 0),
        0
      );

      return NextResponse.json({
        totalOrders,
        activeOrders,
        completedOrders,
        totalSpent: Number(totalSpent.toFixed(2)),
      });
    } else if (userRole === UserRole.DELIVERY_PERSON) {
      // Delivery person stats
      const [totalDeliveries, activeOrders, completedOrders, user] = await Promise.all([
        prisma.order.count({ where: { deliveryPersonId: userId } }),
        prisma.order.count({
          where: {
            deliveryPersonId: userId,
            status: {
              in: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT],
            },
          },
        }),
        prisma.order.count({
          where: {
            deliveryPersonId: userId,
            status: OrderStatus.DELIVERED,
          },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { rating: true, totalDeliveries: true },
        }),
      ]);

      const orders = await prisma.order.findMany({
        where: {
          deliveryPersonId: userId,
          status: OrderStatus.DELIVERED,
        },
        include: { transactions: true },
      });

      const totalEarnings = orders.reduce((sum, order) => {
        const transaction = order?.transactions?.[0];
        if (transaction) {
          // Delivery person gets delivery fee minus platform fee
          return sum + (transaction?.deliveryFee ?? 0);
        }
        return sum;
      }, 0);

      const pendingOrders = await prisma.order.count({
        where: {
          status: OrderStatus.PENDING,
          deliveryPersonId: null,
        },
      });

      return NextResponse.json({
        totalDeliveries,
        activeOrders,
        completedOrders,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        averageRating: user?.rating ?? 0,
        pendingOrders,
      });
    }

    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
