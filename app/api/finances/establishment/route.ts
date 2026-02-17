import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Permitir tanto CLIENT tipo DELIVERY quanto ESTABLISHMENT role
        const isEstablishment =
            session.user.role === 'ESTABLISHMENT' ||
            (session.user.role === 'CLIENT' && session.user.clientType === 'DELIVERY');

        if (!isEstablishment) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const includeCancelled = searchParams.get('includeCancelled') === 'true';

        // Build date filter
        const dateFilter: any = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }

        // Status filter
        const statusFilter: any = includeCancelled
            ? {}
            : {
                status: {
                    notIn: [OrderStatus.CANCELLED],
                },
            };

        // Get all orders for this client/establishment
        const orders = await prisma.order.findMany({
            where: {
                clientId: session.user.id,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
                ...statusFilter,
            },
            include: {
                deliveryPerson: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Get cancelled orders separately
        const cancelledOrders = await prisma.order.findMany({
            where: {
                clientId: session.user.id,
                status: OrderStatus.CANCELLED,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            },
        });

        // Calculate statistics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
        const totalOrders = orders.length;
        const platformFeeRate = 0.10; // 10% platform fee
        const platformFees = totalRevenue * platformFeeRate;
        const netAmount = totalRevenue - platformFees;

        const cancelledOrdersTotal = cancelledOrders.reduce((sum, order) => sum + (order.price || 0), 0);

        // Group by status
        const ordersByStatus = orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Daily revenue for chart (last 30 days or filtered range)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const chartStartDate = startDate ? new Date(startDate) : thirtyDaysAgo;
        const chartEndDate = endDate ? new Date(endDate) : new Date();

        const ordersForChart = await prisma.order.findMany({
            where: {
                clientId: session.user.id,
                status: {
                    notIn: [OrderStatus.CANCELLED],
                },
                createdAt: {
                    gte: chartStartDate,
                    lte: chartEndDate,
                },
            },
            select: {
                price: true,
                createdAt: true,
            },
        });

        // Group by date
        const dailyRevenueMap = ordersForChart.reduce((acc, order) => {
            const date = order.createdAt.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + (order.price || 0);
            return acc;
        }, {} as Record<string, number>);

        const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({
            date,
            value: revenue,
            label: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        }));

        // Payment method distribution (mock data - replace with actual if you have payment method tracking)
        const paymentMethodDistribution = [
            { name: 'Dinheiro', value: totalRevenue * 0.4, color: '#10b981' },
            { name: 'PIX', value: totalRevenue * 0.35, color: '#3b82f6' },
            { name: 'Cartão Crédito', value: totalRevenue * 0.15, color: '#f59e0b' },
            { name: 'Cartão Débito', value: totalRevenue * 0.10, color: '#8b5cf6' },
        ].filter(item => item.value > 0);

        return NextResponse.json({
            totalRevenue,
            totalOrders,
            platformFees,
            netAmount,
            balanceDue: netAmount, // Can be calculated based on payments made
            dailyRevenue,
            paymentMethodDistribution,
            orders: orders.map(order => ({
                id: order.id,
                originAddress: order.originAddress,
                destinationAddress: order.destinationAddress,
                status: order.status,
                price: order.price,
                distance: order.distance,
                createdAt: order.createdAt,
                deliveryPerson: order.deliveryPerson,
            })),
            cancelledOrdersTotal,
            cancelledOrdersCount: cancelledOrders.length,
            ordersByStatus,
        });
    } catch (error) {
        console.error('[API FINANCES ESTABLISHMENT]', error);
        return NextResponse.json({ error: 'Erro ao buscar dados financeiros' }, { status: 500 });
    }
}
