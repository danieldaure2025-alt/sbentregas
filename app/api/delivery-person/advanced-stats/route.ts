import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Obter estatísticas avançadas com dados para gráficos
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        if (user.role !== 'DELIVERY_PERSON' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'month';

        const daysBack = period === 'week' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        startDate.setHours(0, 0, 0, 0);

        // Buscar todos os pedidos entregues no período
        const orders = await prisma.order.findMany({
            where: {
                deliveryPersonId: user.id,
                status: OrderStatus.DELIVERED,
                completedAt: { gte: startDate },
            },
            select: {
                price: true,
                distance: true,
                completedAt: true,
                acceptedAt: true,
            },
        });

        // Ganhos diários
        const dailyEarningsMap = new Map<string, number>();
        orders.forEach((order) => {
            if (order.completedAt) {
                const dateKey = order.completedAt.toISOString().split('T')[0];
                dailyEarningsMap.set(
                    dateKey,
                    (dailyEarningsMap.get(dateKey) || 0) + (order.price || 0)
                );
            }
        });

        const dailyEarnings = Array.from(dailyEarningsMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Entregas por dia da semana
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const deliveriesByDayMap = new Map<string, number>();
        dayNames.forEach((day) => deliveriesByDayMap.set(day, 0));
        orders.forEach((order) => {
            if (order.completedAt) {
                const dayName = dayNames[order.completedAt.getDay()];
                deliveriesByDayMap.set(dayName, (deliveriesByDayMap.get(dayName) || 0) + 1);
            }
        });
        const deliveriesByDay = dayNames.map((day) => ({
            day,
            count: deliveriesByDayMap.get(day) || 0,
        }));

        // Distribuição por distância
        const distanceRanges = [
            { range: '0-2 km', min: 0, max: 2 },
            { range: '2-5 km', min: 2, max: 5 },
            { range: '5-10 km', min: 5, max: 10 },
            { range: '10+ km', min: 10, max: Infinity },
        ];

        const distanceCounts = distanceRanges.map((r) => ({
            range: r.range,
            count: orders.filter(
                (o) => (o.distance || 0) >= r.min && (o.distance || 0) < r.max
            ).length,
            percentage: 0,
        }));

        const totalOrders = orders.length;
        distanceCounts.forEach((d) => {
            d.percentage = totalOrders > 0 ? Math.round((d.count / totalOrders) * 100) : 0;
        });

        // Métricas de desempenho
        const totalEarnings = orders.reduce((sum, o) => sum + (o.price || 0), 0);
        const avgDeliveryTime =
            orders.length > 0
                ? orders.reduce((sum, o) => {
                    if (o.completedAt && o.acceptedAt) {
                        return sum + (o.completedAt.getTime() - o.acceptedAt.getTime()) / 60000;
                    }
                    return sum;
                }, 0) / orders.length
                : 0;

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { rating: true },
        });

        return NextResponse.json({
            dailyEarnings,
            deliveriesByDay,
            distanceDistribution: distanceCounts,
            performance: {
                avgDeliveryTime: Math.round(avgDeliveryTime),
                completionRate: 100,
                avgRating: dbUser?.rating || 0,
                totalDeliveries: totalOrders,
                totalEarnings,
            },
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas avançadas:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
