import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Obter estatísticas básicas do entregador
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        if (user.role !== 'DELIVERY_PERSON' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Início do dia de hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Início da semana
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Total de entregas
        const totalDeliveries = await prisma.order.count({
            where: {
                deliveryPersonId: user.id,
                status: OrderStatus.DELIVERED,
            },
        });

        // Entregas de hoje
        const todayDeliveries = await prisma.order.count({
            where: {
                deliveryPersonId: user.id,
                status: OrderStatus.DELIVERED,
                completedAt: { gte: today },
            },
        });

        // Ganhos de hoje
        const todayEarnings = await prisma.order.aggregate({
            where: {
                deliveryPersonId: user.id,
                status: OrderStatus.DELIVERED,
                completedAt: { gte: today },
            },
            _sum: { price: true },
        });

        // Ganhos da semana
        const weekEarnings = await prisma.order.aggregate({
            where: {
                deliveryPersonId: user.id,
                status: OrderStatus.DELIVERED,
                completedAt: { gte: weekStart },
            },
            _sum: { price: true },
        });

        // Ganhos totais
        const totalEarnings = await prisma.order.aggregate({
            where: {
                deliveryPersonId: user.id,
                status: OrderStatus.DELIVERED,
            },
            _sum: { price: true },
        });

        // Avaliação média
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { rating: true, totalDeliveries: true },
        });

        return NextResponse.json({
            totalDeliveries,
            todayDeliveries,
            todayEarnings: todayEarnings._sum.price || 0,
            weekEarnings: weekEarnings._sum.price || 0,
            totalEarnings: totalEarnings._sum.price || 0,
            averageRating: dbUser?.rating || 0,
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
