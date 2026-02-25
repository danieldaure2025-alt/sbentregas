import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';
import { haversineDistance } from '@/lib/geo-utils';

export const dynamic = 'force-dynamic';

const MAX_GROUP_DISTANCE_KM = 3; // Distância máxima entre origens para agrupar

// GET — Sugerir agrupamentos automáticos de pedidos próximos
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar pedidos PENDING com coordenadas e sem batch
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: OrderStatus.PENDING,
                batchId: null,
                originLatitude: { not: null },
                originLongitude: { not: null },
                destinationLatitude: { not: null },
                destinationLongitude: { not: null },
            },
            select: {
                id: true,
                originAddress: true,
                originLatitude: true,
                originLongitude: true,
                destinationAddress: true,
                destinationLatitude: true,
                destinationLongitude: true,
                price: true,
                distance: true,
                createdAt: true,
                client: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });

        if (pendingOrders.length < 2) {
            return NextResponse.json({ suggestions: [], message: 'Poucos pedidos pendentes para agrupar' });
        }

        // Algoritmo de agrupamento por proximidade (greedy clustering)
        const used = new Set<string>();
        const suggestions: Array<{
            orderIds: string[];
            orders: typeof pendingOrders;
            totalPrice: number;
            totalDistance: number;
            avgOriginDistance: number;
        }> = [];

        for (let i = 0; i < pendingOrders.length; i++) {
            if (used.has(pendingOrders[i].id)) continue;

            const group = [pendingOrders[i]];
            used.add(pendingOrders[i].id);

            for (let j = i + 1; j < pendingOrders.length; j++) {
                if (used.has(pendingOrders[j].id)) continue;

                // Verificar proximidade da origem com cada pedido no grupo
                const isClose = group.every(g => {
                    const dist = haversineDistance(
                        g.originLatitude!, g.originLongitude!,
                        pendingOrders[j].originLatitude!, pendingOrders[j].originLongitude!
                    );
                    return dist <= MAX_GROUP_DISTANCE_KM;
                });

                if (isClose) {
                    group.push(pendingOrders[j]);
                    used.add(pendingOrders[j].id);
                }
            }

            if (group.length >= 2) {
                // Calcular distância média entre origens
                let totalOriginDist = 0;
                let count = 0;
                for (let a = 0; a < group.length; a++) {
                    for (let b = a + 1; b < group.length; b++) {
                        totalOriginDist += haversineDistance(
                            group[a].originLatitude!, group[a].originLongitude!,
                            group[b].originLatitude!, group[b].originLongitude!
                        );
                        count++;
                    }
                }

                suggestions.push({
                    orderIds: group.map(o => o.id),
                    orders: group,
                    totalPrice: group.reduce((sum, o) => sum + o.price, 0),
                    totalDistance: group.reduce((sum, o) => sum + o.distance, 0),
                    avgOriginDistance: count > 0 ? totalOriginDist / count : 0,
                });
            }
        }

        // Ordenar por mais pedidos primeiro
        suggestions.sort((a, b) => b.orderIds.length - a.orderIds.length);

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error suggesting batches:', error);
        return NextResponse.json({ error: 'Erro ao sugerir agrupamentos' }, { status: 500 });
    }
}
