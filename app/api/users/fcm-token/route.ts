import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/mobile-auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/users/fcm-token
 * Register or update FCM token for the current user
 * Supports both NextAuth session (web) and Bearer JWT (mobile)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { fcmToken } = await request.json();

    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json(
        { error: 'Token FCM inválido' },
        { status: 400 }
      );
    }

    // Update user's FCM token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fcmToken,
        fcmTokenUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        fcmToken: true,
        fcmTokenUpdatedAt: true,
      },
    });

    console.log(`FCM token updated for user ${updatedUser.id}: ${fcmToken.substring(0, 20)}...`);

    return NextResponse.json({
      success: true,
      message: 'Token FCM registrado com sucesso',
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar token FCM' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/fcm-token
 * Remove FCM token for the current user (e.g., when logging out)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Remove user's FCM token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fcmToken: null,
        fcmTokenUpdatedAt: null,
      },
    });

    console.log(`FCM token removed for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Token FCM removido com sucesso',
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return NextResponse.json(
      { error: 'Erro ao remover token FCM' },
      { status: 500 }
    );
  }
}
