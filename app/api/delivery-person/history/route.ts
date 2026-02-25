import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';
import { OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Obter histórico de entregas do entregador
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
        const period = searchParams.get('period') || 'today';

        // Calcular filtro de data
        const now = new Date();
        let dateFilter: Date;

        switch (period) {
            case 'today':
                dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        const orders = await prisma.order.findMany({
            where: {
                deliveryPersonId: user.id,
                status: {
                    in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
                },
                completedAt: {
                    gte: dateFilter,
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
            orderBy: { completedAt: 'desc' },
            take: 50,
        });

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Erro ao buscar histórico de entregas:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
