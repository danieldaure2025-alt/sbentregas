import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Obter pedido ativo do entregador
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        if (user.role !== 'DELIVERY_PERSON' && user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        // Buscar o primeiro pedido ativo deste entregador
        const activeOrder = await prisma.order.findFirst({
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
            orderBy: { acceptedAt: 'desc' },
        });

        return NextResponse.json(activeOrder);
    } catch (error) {
        console.error('Erro ao buscar pedido ativo:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
