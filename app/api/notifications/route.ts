import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, NotificationType } from '@prisma/client';
import { sendPushNotification, sendPushNotificationToMultiple } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// GET - Buscar notificações do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    );
  }
}

// POST - Criar e enviar notificação
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { userId, userIds, type, title, body, data } = await request.json();

    // Apenas admin pode enviar notificações para outros
    if (session.user.role !== UserRole.ADMIN && userId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Pelo menos um usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar usuários e tokens FCM
    const users = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, fcmToken: true },
    });

    // Criar notificações no banco
    const notifications = await prisma.notification.createMany({
      data: targetUserIds.map((uid: string) => ({
        userId: uid,
        type: type as NotificationType,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      })),
    });

    // Enviar push notifications
    const fcmTokens = users
      .filter(u => u.fcmToken)
      .map(u => u.fcmToken as string);

    let pushResult = { successCount: 0, failureCount: 0 };

    if (fcmTokens.length > 0) {
      pushResult = await sendPushNotificationToMultiple(fcmTokens, {
        title,
        body,
        data: data || {},
      });

      // Atualizar notificações com status de envio
      await prisma.notification.updateMany({
        where: {
          userId: { in: users.filter(u => u.fcmToken).map(u => u.id) },
          createdAt: { gte: new Date(Date.now() - 5000) }, // Últimos 5 segundos
        },
        data: {
          fcmSent: true,
          fcmSentAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      notificationsCreated: notifications.count,
      pushSent: pushResult.successCount,
      pushFailed: pushResult.failureCount,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Erro ao criar notificação' },
      { status: 500 }
    );
  }
}

// PATCH - Marcar notificações como lidas
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { notificationIds, markAll } = await request.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } else if (notificationIds?.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Erro ao marcar notificações' },
      { status: 500 }
    );
  }
}
