import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Get current user's online status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DELIVERY_PERSON) {
      return NextResponse.json({ error: 'Apenas entregadores podem usar esta função' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isOnline: true, lastOnlineAt: true },
    });

    return NextResponse.json({
      isOnline: user?.isOnline ?? false,
      lastOnlineAt: user?.lastOnlineAt,
    });
  } catch (error) {
    console.error('Error fetching online status:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status' },
      { status: 500 }
    );
  }
}

// PUT - Toggle online status
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DELIVERY_PERSON) {
      return NextResponse.json({ error: 'Apenas entregadores podem usar esta função' }, { status: 403 });
    }

    const body = await req.json();
    const { isOnline } = body;

    const updateData: any = {
      isOnline,
    };

    if (isOnline) {
      updateData.lastOnlineAt = new Date();
    } else {
      // Clear location when going offline
      updateData.currentLatitude = null;
      updateData.currentLongitude = null;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { isOnline: true, lastOnlineAt: true },
    });

    return NextResponse.json({
      success: true,
      isOnline: user.isOnline,
      lastOnlineAt: user.lastOnlineAt,
    });
  } catch (error) {
    console.error('Error updating online status:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}
