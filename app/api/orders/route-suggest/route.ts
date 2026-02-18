import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
    DriverState,
    findEnRouteOrders,
    loadRoutingConfig,
    OrderLocation,
} from '@/lib/route-engine';
import { OrderStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/route-suggest
 * 
 * Called by the mobile app when a driver is en route.
 * Returns nearby pending orders that can be added to the driver's current route.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        if (session.user.role !== 'DELIVERY_PERSON') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const body = await req.json();
        const { latitude, longitude, activeOrderIds } = body;

        if (!latitude || !longitude) {
            return NextResponse.json(
                { error: 'Localização é obrigatória' },
                { status: 400 }
            );
        }

        // Load routing configuration
        const config = await loadRoutingConfig();

        if (!config.enabled) {
            return NextResponse.json({ suggestions: [] });
        }

        // Get driver's active orders with coordinates
        const activeOrders = activeOrderIds && activeOrderIds.length > 0
            ? await prisma.order.findMany({
                where: {
                    id: { in: activeOrderIds },
                    deliveryPersonId: session.user.id,
                    status: { in: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT] },
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
                },
            })
            : [];

        // Build driver state
        const driver: DriverState = {
            id: session.user.id,
            latitude,
            longitude,
            activeOrderIds: activeOrders.map((o) => o.id),
            activeOrders: activeOrders
                .filter((o) => o.originLatitude && o.originLongitude && o.destinationLatitude && o.destinationLongitude)
                .map((o) => ({
                    id: o.id,
                    originAddress: o.originAddress,
                    originLatitude: o.originLatitude!,
                    originLongitude: o.originLongitude!,
                    destinationAddress: o.destinationAddress,
                    destinationLatitude: o.destinationLatitude!,
                    destinationLongitude: o.destinationLongitude!,
                    price: o.price,
                    distance: o.distance,
                    createdAt: o.createdAt,
                })),
        };

        // Get pending orders not assigned to any driver
        const pendingOrders = await prisma.order.findMany({
            where: {
                status: OrderStatus.PENDING,
                deliveryPersonId: null,
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
            },
        });

        const pendingOrderLocations: OrderLocation[] = pendingOrders.map((o) => ({
            id: o.id,
            originAddress: o.originAddress,
            originLatitude: o.originLatitude!,
            originLongitude: o.originLongitude!,
            destinationAddress: o.destinationAddress,
            destinationLatitude: o.destinationLatitude!,
            destinationLongitude: o.destinationLongitude!,
            price: o.price,
            distance: o.distance,
            createdAt: o.createdAt,
        }));

        // Find suggestions
        const suggestions = findEnRouteOrders(driver, pendingOrderLocations, config);

        // Return top 3 suggestions
        return NextResponse.json({
            suggestions: suggestions.slice(0, 3),
        });
    } catch (error) {
        console.error('[Route-Suggest] Error:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
