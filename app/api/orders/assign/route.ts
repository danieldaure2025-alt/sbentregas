import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { DeliveryPersonStatus, EventType, OrderStatus, UserRole } from '@prisma/client';
import { sendPushNotification } from '@/lib/firebase-admin';

// POST - Admin atribui pedido manualmente a um entregador
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        if (session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
        }

        const { orderId, deliveryPersonId } = await request.json();

        if (!orderId || !deliveryPersonId) {
            return NextResponse.json(
                { error: 'orderId e deliveryPersonId são obrigatórios' },
                { status: 400 }
            );
        }

        // Verificar pedido
        const order = await prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
        }

        if (order.status !== OrderStatus.PENDING && order.status !== 'NO_COURIER_AVAILABLE') {
            return NextResponse.json(
                { error: `Pedido não pode ser atribuído (status: ${order.status})` },
                { status: 400 }
            );
        }

        // Verificar entregador
        const deliveryPerson = await prisma.user.findUnique({
            where: { id: deliveryPersonId },
            select: {
                id: true,
                name: true,
                role: true,
                status: true,
                fcmToken: true,
            },
        });

        if (!deliveryPerson) {
            return NextResponse.json({ error: 'Entregador não encontrado' }, { status: 404 });
        }

        if (deliveryPerson.role !== 'DELIVERY_PERSON') {
            return NextResponse.json({ error: 'Usuário não é entregador' }, { status: 400 });
        }

        const now = new Date();

        // Atribuir pedido
        await prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryPersonId: deliveryPersonId,
                status: OrderStatus.ACCEPTED,
                acceptedAt: now,
            },
        });

        // Atualizar status do entregador
        await prisma.user.update({
            where: { id: deliveryPersonId },
            data: {
                deliveryStatus: DeliveryPersonStatus.EM_ROTA_COLETA,
                activeOrderId: orderId,
            },
        });

        // Cancelar ofertas PENDING deste pedido
        await prisma.orderOffer.updateMany({
            where: {
                orderId,
                status: 'PENDING',
            },
            data: {
                status: 'EXPIRED',
                respondedAt: now,
            },
        });

        // Registrar evento
        await prisma.eventLog.create({
            data: {
                userId: session.user.id,
                orderId,
                eventType: EventType.ORDER_ACCEPT,
                details: JSON.stringify({
                    assignedBy: session.user.id,
                    assignedTo: deliveryPersonId,
                    deliveryPersonName: deliveryPerson.name,
                    mode: 'MANUAL_ASSIGN',
                }),
            },
        });

        // Enviar push para o entregador
        if (deliveryPerson.fcmToken) {
            try {
                await sendPushNotification(deliveryPerson.fcmToken, {
                    title: '📦 Pedido Atribuído!',
                    body: `Pedido #${orderId.slice(-6)} atribuído a você. De: ${order.originAddress.split(',')[0]}`,
                    data: {
                        type: 'ORDER_ASSIGNED',
                        orderId,
                    },
                });
            } catch (pushError) {
                console.error('[Manual Assign] Erro ao enviar push:', pushError);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Pedido atribuído a ${deliveryPerson.name}`,
            orderId,
            deliveryPersonId,
            deliveryPersonName: deliveryPerson.name,
        });
    } catch (error) {
        console.error('[Manual Assign] Erro:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
