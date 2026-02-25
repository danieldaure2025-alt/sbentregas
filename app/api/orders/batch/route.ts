import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET — Listar lotes ativos
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar batchIds únicos com pedidos ativos
        const batchOrders = await prisma.order.findMany({
            where: {
                batchId: { not: null },
                status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT] },
            },
            select: {
                id: true,
                batchId: true,
                batchOrder: true,
                status: true,
                originAddress: true,
                destinationAddress: true,
                originLatitude: true,
                originLongitude: true,
                destinationLatitude: true,
                destinationLongitude: true,
                price: true,
                distance: true,
                createdAt: true,
                client: { select: { id: true, name: true } },
                deliveryPerson: { select: { id: true, name: true } },
            },
            orderBy: [{ batchId: 'desc' }, { batchOrder: 'asc' }],
        });

        // Agrupar por batchId
        const batches: Record<string, typeof batchOrders> = {};
        batchOrders.forEach(order => {
            const bid = order.batchId!;
            if (!batches[bid]) batches[bid] = [];
            batches[bid].push(order);
        });

        const result = Object.entries(batches).map(([batchId, orders]) => ({
            batchId,
            orderCount: orders.length,
            deliveryPerson: orders[0].deliveryPerson,
            totalPrice: orders.reduce((sum, o) => sum + o.price, 0),
            totalDistance: orders.reduce((sum, o) => sum + o.distance, 0),
            orders,
        }));

        return NextResponse.json({ batches: result });
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json({ error: 'Erro ao buscar lotes' }, { status: 500 });
    }
}

// POST — Criar lote manualmente (admin)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const { orderIds, deliveryPersonId } = await req.json();

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length < 2) {
            return NextResponse.json({ error: 'Selecione ao menos 2 pedidos' }, { status: 400 });
        }

        if (!deliveryPersonId) {
            return NextResponse.json({ error: 'Selecione um entregador' }, { status: 400 });
        }

        // Verificar se entregador existe e está ativo
        const deliveryPerson = await prisma.user.findUnique({
            where: { id: deliveryPersonId },
            select: { id: true, name: true, role: true, status: true },
        });

        if (!deliveryPerson || deliveryPerson.role !== UserRole.DELIVERY_PERSON) {
            return NextResponse.json({ error: 'Entregador não encontrado' }, { status: 404 });
        }

        // Verificar pedidos
        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds },
                status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED] },
            },
            select: {
                id: true,
                status: true,
                originLatitude: true,
                originLongitude: true,
                destinationLatitude: true,
                destinationLongitude: true,
            },
        });

        if (orders.length !== orderIds.length) {
            return NextResponse.json({
                error: `Apenas ${orders.length} de ${orderIds.length} pedidos estão disponíveis para agrupamento`,
            }, { status: 400 });
        }

        // Gerar batchId
        const batchId = crypto.randomUUID();

        // Atribuir todos os pedidos ao entregador com batchOrder
        await Promise.all(
            orderIds.map((orderId: string, index: number) =>
                prisma.order.update({
                    where: { id: orderId },
                    data: {
                        batchId,
                        batchOrder: index + 1,
                        deliveryPersonId,
                        status: OrderStatus.ACCEPTED,
                        acceptedAt: new Date(),
                    },
                })
            )
        );

        return NextResponse.json({
            success: true,
            batchId,
            orderCount: orderIds.length,
            deliveryPerson: { id: deliveryPerson.id, name: deliveryPerson.name },
        });
    } catch (error) {
        console.error('Error creating batch:', error);
        return NextResponse.json({ error: 'Erro ao criar lote' }, { status: 500 });
    }
}
