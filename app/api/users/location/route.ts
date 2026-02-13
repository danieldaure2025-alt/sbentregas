import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PUT - Update delivery person's current location
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
    const { latitude, longitude } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Latitude e longitude são obrigatórios' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar localização' },
      { status: 500 }
    );
  }
}
