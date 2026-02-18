import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { EventType } from '@prisma/client';

// GET - Listar alertas de emergência
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: Record<string, unknown> = {};
    if (resolved !== null) {
      whereClause.isResolved = resolved === 'true';
    }

    const alerts = await prisma.emergencyAlert.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            activeOrderId: true,
            currentLatitude: true,
            currentLongitude: true,
            deliveryStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Contar não resolvidos
    const unresolvedCount = await prisma.emergencyAlert.count({
      where: { isResolved: false },
    });

    return NextResponse.json({ 
      alerts,
      unresolvedCount,
    });
  } catch (error) {
    console.error('Erro ao listar emergências:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PATCH - Resolver emergência (admin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true },
    });

    if (admin?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const { alertId, notes } = await request.json();

    if (!alertId) {
      return NextResponse.json({ error: 'alertId obrigatório' }, { status: 400 });
    }

    const alert = await prisma.emergencyAlert.findUnique({
      where: { id: alertId },
      include: {
        user: {
          select: { id: true, name: true, deliveryStatus: true, activeOrderId: true },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    if (alert.isResolved) {
      return NextResponse.json({ error: 'Alerta já foi resolvido' }, { status: 400 });
    }

    // Resolver alerta
    await prisma.emergencyAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        resolutionNotes: notes || `Resolvido por ${admin.name}`,
      },
    });

    // Atualizar status do entregador (voltar para ONLINE)
    if (alert.user.deliveryStatus === 'EM_EMERGENCIA') {
      const newStatus = alert.user.activeOrderId ? 'EM_ROTA_COLETA' : 'ONLINE';
      
      await prisma.user.update({
        where: { id: alert.userId },
        data: { deliveryStatus: newStatus },
      });
    }

    // Registrar evento
    await prisma.eventLog.create({
      data: {
        userId: alert.userId,
        orderId: alert.user.activeOrderId,
        eventType: EventType.PANICO_RESOLVIDO,
        details: JSON.stringify({
          alertId,
          resolvedBy: session.user.id,
          adminName: admin.name,
          notes,
        }),
        latitude: alert.latitude,
        longitude: alert.longitude,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Emergência resolvida.',
    });
  } catch (error) {
    console.error('Erro ao resolver emergência:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
