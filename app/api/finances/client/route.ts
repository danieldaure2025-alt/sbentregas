import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, PaymentStatus, OrderStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Buscar dados financeiros do cliente
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        if (session.user.role !== UserRole.CLIENT) {
            return NextResponse.json(
                { error: 'Acesso permitido apenas para clientes' },
                { status: 403 }
            );
        }

        const userId = session.user.id;
        const url = new URL(req.url);
        const period = url.searchParams.get('period') || 'month';
        const startDateParam = url.searchParams.get('startDate');
        const endDateParam = url.searchParams.get('endDate');
        const includeCancelled = url.searchParams.get('includeCancelled') === 'true';

        // Calcular data de início baseado no período ou usar startDate/endDate customizado
        let startDate: Date;
        let endDate: Date = new Date();

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'day') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            startDate = new Date(0); // all time
        }

        // Buscar todos os pedidos do cliente no período
        const allOrders = await prisma.order.findMany({
            where: {
                clientId: userId,
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                transactions: {
                    where: { paymentStatus: PaymentStatus.COMPLETED },
                },
                deliveryPerson: {
                    select: { name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Separar cancelados de não-cancelados
        const cancelledOrders = allOrders.filter(o => o.status === OrderStatus.CANCELLED);
        const activeOrders = allOrders.filter(o =>
            o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.DELIVERED
        );
        const completedOrders = allOrders.filter(o => o.status === OrderStatus.DELIVERED);

        // Pedidos a exibir (baseado no filtro includeCancelled)
        const displayOrders = includeCancelled
            ? allOrders
            : allOrders.filter(o => o.status !== OrderStatus.CANCELLED);

        // Calcular total gasto (apenas pedidos pagos, excluindo cancelados)
        const totalSpent = completedOrders.reduce((sum, order) => {
            const tx = order.transactions[0];
            return sum + (tx?.totalAmount || 0);
        }, 0);

        // Estatísticas por status
        const statsByStatus = allOrders.reduce((acc, order) => {
            const status = order.status;
            if (!acc[status]) {
                acc[status] = { status, count: 0, total: 0 };
            }
            acc[status].count++;

            const tx = order.transactions[0];
            if (tx) {
                acc[status].total += tx.totalAmount;
            }

            return acc;
        }, {} as Record<string, { status: string; count: number; total: number }>);

        // Estatísticas por método de pagamento (apenas completed)
        const statsByPayment = completedOrders.reduce((acc, order) => {
            const method = order.paymentMethod || 'UNKNOWN';
            if (!acc[method]) {
                acc[method] = { method, count: 0, total: 0 };
            }
            acc[method].count++;

            const tx = order.transactions[0];
            if (tx) {
                acc[method].total += tx.totalAmount;
            }

            return acc;
        }, {} as Record<string, { method: string; count: number; total: number }>);

        return NextResponse.json({
            totalSpent,
            activeOrders: activeOrders.length,
            completedOrders: completedOrders.length,
            cancelledOrders: cancelledOrders.length,
            orders: displayOrders.map(order => ({
                id: order.id,
                originAddress: order.originAddress,
                destinationAddress: order.destinationAddress,
                status: order.status,
                price: order.price,
                distance: order.distance,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt,
                completedAt: order.completedAt,
                deliveryPerson: order.deliveryPerson,
                transaction: order.transactions[0] || null,
            })),
            stats: {
                byStatus: Object.values(statsByStatus),
                byPaymentMethod: Object.values(statsByPayment),
            },
        });
    } catch (error) {
        console.error('Erro ao buscar finanças do cliente:', error);
        return NextResponse.json(
            { error: 'Erro ao carregar dados financeiros' },
            { status: 500 }
        );
    }
}
