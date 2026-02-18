import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendPushNotificationToMultiple } from '@/lib/firebase-admin';
import { LinkType, NotificationCategory, NotificationType, TargetAudience, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper: mapear targetAudience para roles
function getTargetRoles(audience: TargetAudience): UserRole[] | null {
  switch (audience) {
    case 'CLIENTS': return [UserRole.CLIENT];
    case 'DELIVERY_PERSONS': return [UserRole.DELIVERY_PERSON];
    case 'ESTABLISHMENTS': return [UserRole.ESTABLISHMENT];
    case 'ALL': return null; // all roles
    default: return null;
  }
}

// Helper: mapear category para canal Android
function getAndroidChannel(category: NotificationCategory): string {
  switch (category) {
    case 'URGENTE': return 'urgent';
    case 'PROMOCIONAL': return 'promotions';
    case 'INFORMATIVA': return 'admin_notices';
    default: return 'default';
  }
}

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
    const countOnly = searchParams.get('countOnly') === 'true';

    // Se só quer a contagem
    if (countOnly) {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: session.user.id,
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });
      return NextResponse.json({ unreadCount });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        ...(unreadOnly && { isRead: false }),
        // Filtrar expiradas
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
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

// POST - Criar e enviar notificação (admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      userIds,
      type,
      title,
      body: notifBody,
      data,
      // Campos estendidos
      imageUrl,
      linkUrl,
      linkType,
      category = 'INFORMATIVA',
      expiresAt,
      targetAudience = 'ALL',
    } = body;

    // Apenas admin pode enviar notificações para outros
    if (session.user.role !== UserRole.ADMIN && userId !== session.user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Resolver IDs de destino
    let targetUserIds: string[] = userIds || (userId ? [userId] : []);

    // Se admin está enviando para um público-alvo (sem IDs específicos)
    if (targetUserIds.length === 0 && session.user.role === UserRole.ADMIN) {
      const targetRoles = getTargetRoles(targetAudience as TargetAudience);

      const whereClause: any = {
        status: 'ACTIVE',
      };

      if (targetRoles) {
        whereClause.role = { in: targetRoles };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      targetUserIds = users.map(u => u.id);
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado para o público-alvo' },
        { status: 400 }
      );
    }

    // Buscar tokens FCM
    const users = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, fcmToken: true },
    });

    // Dados extras para o push payload
    const pushData: Record<string, string> = {
      ...(data || {}),
      ...(imageUrl && { imageUrl }),
      ...(linkUrl && { linkUrl }),
      ...(linkType && { linkType }),
      ...(category && { category }),
      ...(expiresAt && { expiresAt }),
    };

    // Criar notificações no banco
    const notifications = await prisma.notification.createMany({
      data: targetUserIds.map((uid: string) => ({
        userId: uid,
        type: (type as NotificationType) || NotificationType.ADMIN_NOTICE,
        title,
        body: notifBody,
        data: data ? JSON.stringify(data) : null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        linkType: (linkType as LinkType) || null,
        category: (category as NotificationCategory) || 'INFORMATIVA',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        targetAudience: (targetAudience as TargetAudience) || 'ALL',
      })),
    });

    // Enviar push notifications
    const fcmTokens = users
      .filter(u => u.fcmToken)
      .map(u => u.fcmToken as string);

    let pushResult = { successCount: 0, failureCount: 0 };

    if (fcmTokens.length > 0) {
      const androidChannel = getAndroidChannel(category as NotificationCategory);

      pushResult = await sendPushNotificationToMultiple(fcmTokens, {
        title,
        body: notifBody,
        data: pushData,
      });

      // Atualizar notificações com status de envio
      await prisma.notification.updateMany({
        where: {
          userId: { in: users.filter(u => u.fcmToken).map(u => u.id) },
          createdAt: { gte: new Date(Date.now() - 5000) },
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
      targetUsers: targetUserIds.length,
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

// PATCH - Marcar notificações como lidas / registrar clique
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { notificationIds, markAll, trackClick } = await request.json();

    // Track click
    if (trackClick && notificationIds?.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: {
          clickedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

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
