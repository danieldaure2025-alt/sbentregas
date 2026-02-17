import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendPushNotificationToMultiple } from '@/lib/firebase-admin';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { title, body: messageBody, imageUrl, targetAudience } = body;

        if (!title || !messageBody || !targetAudience) {
            return NextResponse.json(
                { error: 'Título, mensagem e público-alvo são obrigatórios' },
                { status: 400 }
            );
        }

        // Buscar FCM tokens baseado no público-alvo
        let usersWhere: any = { fcmToken: { not: null } };

        if (targetAudience === 'CLIENTS') {
            usersWhere.role = UserRole.CLIENT;
        } else if (targetAudience === 'DELIVERY_PERSONS') {
            usersWhere.role = UserRole.DELIVERY_PERSON;
        }
        // Se targetAudience === 'ALL', busca todos com fcmToken

        const users = await prisma.user.findMany({
            where: usersWhere,
            select: { fcmToken: true },
        });

        const fcmTokens = users
            .map((u) => u.fcmToken)
            .filter((token): token is string => token !== null);

        if (fcmTokens.length === 0) {
            return NextResponse.json(
                { error: 'Nenhum usuário encontrado com token FCM' },
                { status: 400 }
            );
        }

        // Enviar notificação push
        const result = await sendPushNotificationToMultiple(fcmTokens, {
            title,
            body: messageBody,
            icon: imageUrl,
        });

        // Registrar no banco de dados
        const notification = await prisma.pushNotification.create({
            data: {
                title,
                body: messageBody,
                imageUrl,
                targetAudience,
                sentBy: session.user.id,
                recipientCount: result.successCount,
            },
            include: {
                admin: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return NextResponse.json({
            notification,
            result: {
                successCount: result.successCount,
                failureCount: result.failureCount,
                totalRecipients: fcmTokens.length,
            },
        });
    } catch (error) {
        console.error('Error sending push notification:', error);
        return NextResponse.json(
            { error: 'Erro ao enviar notificação' },
            { status: 500 }
        );
    }
}
