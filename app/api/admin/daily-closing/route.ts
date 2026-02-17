import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        if (!dateParam) {
            return NextResponse.json({ error: 'Data não fornecida' }, { status: 400 });
        }

        const selectedDate = new Date(dateParam);
        const startDate = startOfDay(selectedDate);
        const endDate = endOfDay(selectedDate);

        // Buscar todos os pedidos válidos do dia (excluindo cancelados e sem entregador)
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                status: {
                    in: ['DELIVERED', 'PICKED_UP', 'IN_TRANSIT', 'ACCEPTED', 'PENDING'],
                },
            },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                deliveryPerson: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Agrupar pedidos por cliente
        const clientsMap = new Map<string, {
            clientId: string;
            clientName: string;
            clientEmail: string;
            clientPhone: string | null;
            orders: Array<{
                id: string;
                orderNumber: string | null;
                status: string;
                price: number;
                distance: number;
                paymentMethod: string | null;
                createdAt: string;
                deliveryPerson: {
                    id: string;
                    name: string | null;
                } | null;
                originAddress: string;
                destinationAddress: string;
            }>;
            totalOrders: number;
            totalValue: number;
            deliveryPersons: Set<string>;
        }>();

        orders.forEach((order) => {
            const clientId = order.clientId;

            if (!clientsMap.has(clientId)) {
                clientsMap.set(clientId, {
                    clientId: order.client.id,
                    clientName: order.client.name || order.client.email,
                    clientEmail: order.client.email,
                    clientPhone: order.client.phone,
                    orders: [],
                    totalOrders: 0,
                    totalValue: 0,
                    deliveryPersons: new Set(),
                });
            }

            const clientData = clientsMap.get(clientId)!;

            clientData.orders.push({
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                price: order.price,
                distance: order.distance,
                paymentMethod: order.paymentMethod,
                createdAt: order.createdAt.toISOString(),
                deliveryPerson: order.deliveryPerson ? {
                    id: order.deliveryPerson.id,
                    name: order.deliveryPerson.name,
                } : null,
                originAddress: order.originAddress,
                destinationAddress: order.destinationAddress,
            });

            clientData.totalOrders += 1;
            clientData.totalValue += order.price;

            if (order.deliveryPerson) {
                clientData.deliveryPersons.add(order.deliveryPerson.name || order.deliveryPerson.email);
            }
        });

        // Converter Map para array e processar deliveryPersons
        const clientsList = Array.from(clientsMap.values()).map((client) => ({
            ...client,
            deliveryPersons: Array.from(client.deliveryPersons),
        }));

        // Calcular resumo geral do dia
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
        const uniqueDeliveryPersons = new Set(
            orders
                .filter((order) => order.deliveryPerson)
                .map((order) => order.deliveryPerson!.id)
        );
        const totalDeliveryPersons = uniqueDeliveryPersons.size;
        const totalClients = clientsList.length;

        // Contar pedidos por status
        const ordersByStatus = {
            delivered: orders.filter((o) => o.status === 'DELIVERED').length,
            inProgress: orders.filter((o) => ['PICKED_UP', 'IN_TRANSIT', 'ACCEPTED'].includes(o.status)).length,
            pending: orders.filter((o) => o.status === 'PENDING').length,
        };

        return NextResponse.json({
            date: dateParam,
            summary: {
                totalOrders,
                totalRevenue,
                totalDeliveryPersons,
                totalClients,
                ordersByStatus,
            },
            clients: clientsList,
        });
    } catch (error) {
        console.error('Erro ao buscar dados de fechamento diário:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar dados' },
            { status: 500 }
        );
    }
}
