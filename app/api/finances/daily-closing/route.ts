import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { OrderStatus, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

        const url = new URL(req.url);
        const dateParam = url.searchParams.get('date');

        // Parse date: default to today
        let startDate: Date;
        let endDate: Date;

        if (dateParam) {
            startDate = new Date(dateParam + 'T00:00:00');
            endDate = new Date(dateParam + 'T23:59:59.999');
        } else {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        }

        // Get all delivered orders of the day with relations
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: { not: OrderStatus.CANCELLED },
            },
            include: {
                client: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                deliveryPerson: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                transactions: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Group by client
        const clientMap = new Map<string, {
            id: string;
            name: string;
            email: string;
            phone: string | null;
            orders: number;
            totalValue: number;
            platformFee: number;
            deliveryFee: number;
            paymentMethods: Set<string>;
            delivered: number;
            pending: number;
        }>();

        // Group by delivery person
        const deliveryMap = new Map<string, {
            id: string;
            name: string;
            email: string;
            phone: string | null;
            orders: number;
            totalDeliveryFee: number;
            totalValue: number;
            delivered: number;
            pending: number;
        }>();

        let totalRevenue = 0;
        let totalPlatformFees = 0;
        let totalDeliveryFees = 0;
        let totalOrders = orders.length;
        let deliveredCount = 0;
        let pendingCount = 0;

        for (const order of orders) {
            const isDelivered = order.status === OrderStatus.DELIVERED;
            if (isDelivered) deliveredCount++;
            else pendingCount++;

            // Sum from transactions if available, otherwise from order price
            const txPlatformFee = order.transactions.reduce((s, t) => s + t.platformFee, 0);
            const txDeliveryFee = order.transactions.reduce((s, t) => s + t.deliveryFee, 0);
            const txTotal = order.transactions.reduce((s, t) => s + t.totalAmount, 0);
            const orderValue = txTotal || order.price;
            const platformFee = txPlatformFee;
            const deliveryFee = txDeliveryFee;

            totalRevenue += orderValue;
            totalPlatformFees += platformFee;
            totalDeliveryFees += deliveryFee;

            // Client grouping
            const clientId = order.clientId;
            const clientName = order.client?.name || order.client?.email || 'Desconhecido';
            if (!clientMap.has(clientId)) {
                clientMap.set(clientId, {
                    id: clientId,
                    name: clientName,
                    email: order.client?.email || '',
                    phone: order.client?.phone || null,
                    orders: 0,
                    totalValue: 0,
                    platformFee: 0,
                    deliveryFee: 0,
                    paymentMethods: new Set(),
                    delivered: 0,
                    pending: 0,
                });
            }
            const clientEntry = clientMap.get(clientId)!;
            clientEntry.orders++;
            clientEntry.totalValue += orderValue;
            clientEntry.platformFee += platformFee;
            clientEntry.deliveryFee += deliveryFee;
            if (order.paymentMethod) clientEntry.paymentMethods.add(order.paymentMethod);
            if (isDelivered) clientEntry.delivered++;
            else clientEntry.pending++;

            // Delivery person grouping
            if (order.deliveryPersonId && order.deliveryPerson) {
                const dpId = order.deliveryPersonId;
                const dpName = order.deliveryPerson.name || order.deliveryPerson.email || 'Desconhecido';
                if (!deliveryMap.has(dpId)) {
                    deliveryMap.set(dpId, {
                        id: dpId,
                        name: dpName,
                        email: order.deliveryPerson.email || '',
                        phone: order.deliveryPerson.phone || null,
                        orders: 0,
                        totalDeliveryFee: 0,
                        totalValue: 0,
                        delivered: 0,
                        pending: 0,
                    });
                }
                const dpEntry = deliveryMap.get(dpId)!;
                dpEntry.orders++;
                dpEntry.totalDeliveryFee += deliveryFee;
                dpEntry.totalValue += orderValue;
                if (isDelivered) dpEntry.delivered++;
                else dpEntry.pending++;
            }
        }

        // Convert Maps to sorted arrays
        const byClient = Array.from(clientMap.values())
            .map(c => ({
                ...c,
                paymentMethods: Array.from(c.paymentMethods),
            }))
            .sort((a, b) => b.totalValue - a.totalValue);

        const byDeliveryPerson = Array.from(deliveryMap.values())
            .sort((a, b) => b.totalDeliveryFee - a.totalDeliveryFee);

        return NextResponse.json({
            date: dateParam || new Date().toISOString().split('T')[0],
            summary: {
                totalRevenue,
                totalPlatformFees,
                totalDeliveryFees,
                totalOrders,
                deliveredCount,
                pendingCount,
            },
            byClient,
            byDeliveryPerson,
        });
    } catch (error) {
        console.error('Error fetching daily closing:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar dados de fechamento' },
            { status: 500 }
        );
    }
}
