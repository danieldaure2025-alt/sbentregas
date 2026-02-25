import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Obter todos os pedidos ativos do entregador (entregas múltiplas)
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        if (user.role !== 'DELIVERY_PERSON' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const activeOrders = await prisma.order.findMany({
            where: {
                deliveryPersonId: user.id,
                status: {
                    in: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT],
                },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: { acceptedAt: 'asc' },
        });

        return NextResponse.json(activeOrders);
    } catch (error) {
        console.error('Erro ao buscar pedidos ativos:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
