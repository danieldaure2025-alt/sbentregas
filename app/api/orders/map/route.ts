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
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar pedidos ativos (não cancelados e não completados há mais de 24h)
        const activeStatuses = [
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED,
            OrderStatus.PICKED_UP,
            OrderStatus.IN_TRANSIT,
            OrderStatus.AWAITING_PAYMENT,
        ];

        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { status: { in: activeStatuses } },
                    {
                        status: OrderStatus.DELIVERED,
                        completedAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // últimas 2h
                    },
                ],
            },
            select: {
                id: true,
                status: true,
                originAddress: true,
                originLatitude: true,
                originLongitude: true,
                destinationAddress: true,
                destinationLatitude: true,
                destinationLongitude: true,
                price: true,
                distance: true,
                isScheduled: true,
                scheduledAt: true,
                createdAt: true,
                client: { select: { id: true, name: true } },
                deliveryPerson: { select: { id: true, name: true, currentLatitude: true, currentLongitude: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        // Buscar entregadores online
        const deliveryPersons = await prisma.user.findMany({
            where: {
                role: UserRole.DELIVERY_PERSON,
                isOnline: true,
                currentLatitude: { not: null },
                currentLongitude: { not: null },
            },
            select: {
                id: true,
                name: true,
                currentLatitude: true,
                currentLongitude: true,
                vehicleType: true,
                deliveryStatus: true,
            },
        });

        return NextResponse.json({ orders, deliveryPersons });
    } catch (error) {
        console.error('Error fetching map data:', error);
        return NextResponse.json({ error: 'Erro ao buscar dados do mapa' }, { status: 500 });
    }
}
