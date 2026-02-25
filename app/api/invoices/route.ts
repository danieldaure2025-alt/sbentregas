import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, PaymentMethod, InvoiceStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Listar pedidos faturados agrupados por cliente
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status') || 'all';
        const cycleFilter = searchParams.get('cycle') || 'all';

        // Buscar pedidos faturados
        const whereClause: any = {
            paymentMethod: PaymentMethod.INVOICED,
        };

        if (statusFilter !== 'all') {
            whereClause.invoiceStatus = statusFilter as InvoiceStatus;
        }

        if (cycleFilter !== 'all') {
            whereClause.billingCycle = cycleFilter;
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        billingCycle: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Agrupar por cliente
        const clientGroups: Record<string, {
            client: { id: string; name: string | null; email: string; phone: string | null; billingCycle: string | null };
            orders: typeof orders;
            totalAmount: number;
            pendingCount: number;
            paidCount: number;
            overdueCount: number;
        }> = {};

        for (const order of orders) {
            const clientId = order.clientId;
            if (!clientGroups[clientId]) {
                clientGroups[clientId] = {
                    client: order.client,
                    orders: [],
                    totalAmount: 0,
                    pendingCount: 0,
                    paidCount: 0,
                    overdueCount: 0,
                };
            }
            clientGroups[clientId].orders.push(order);
            clientGroups[clientId].totalAmount += order.price;

            if (order.invoiceStatus === InvoiceStatus.PENDING || !order.invoiceStatus) {
                clientGroups[clientId].pendingCount++;
            } else if (order.invoiceStatus === InvoiceStatus.PAID) {
                clientGroups[clientId].paidCount++;
            } else if (order.invoiceStatus === InvoiceStatus.OVERDUE) {
                clientGroups[clientId].overdueCount++;
            }
        }

        // Resumo geral
        const totalPending = orders
            .filter(o => o.invoiceStatus === InvoiceStatus.PENDING || !o.invoiceStatus)
            .reduce((sum, o) => sum + o.price, 0);
        const totalPaid = orders
            .filter(o => o.invoiceStatus === InvoiceStatus.PAID)
            .reduce((sum, o) => sum + o.price, 0);
        const totalOverdue = orders
            .filter(o => o.invoiceStatus === InvoiceStatus.OVERDUE)
            .reduce((sum, o) => sum + o.price, 0);

        return NextResponse.json({
            clients: Object.values(clientGroups),
            summary: {
                totalPending,
                totalPaid,
                totalOverdue,
                totalOrders: orders.length,
            },
        });
    } catch (error) {
        console.error('Erro ao buscar faturados:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// PATCH - Atualizar status de faturas
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const body = await request.json();
        const { orderIds, status } = body;

        if (!orderIds || !Array.isArray(orderIds) || !status) {
            return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
        }

        if (!Object.values(InvoiceStatus).includes(status)) {
            return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
        }

        const updateData: any = {
            invoiceStatus: status,
        };

        if (status === InvoiceStatus.PAID) {
            updateData.invoicePaidAt = new Date();
        }

        await prisma.order.updateMany({
            where: {
                id: { in: orderIds },
                paymentMethod: PaymentMethod.INVOICED,
            },
            data: updateData,
        });

        return NextResponse.json({ success: true, updated: orderIds.length });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
