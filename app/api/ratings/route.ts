import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, OrderStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// POST create rating (CLIENT only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json(
        { error: 'Apenas clientes podem avaliar' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, rating, comment } = body;

    if (!orderId || !rating) {
      return NextResponse.json(
        { error: 'ID do pedido e avaliação são obrigatórios' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Avaliação deve ser entre 1 e 5' },
        { status: 400 }
      );
    }

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { rating: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Check if client owns the order
    if (order.clientId !== session.user.id) {
      return NextResponse.json(
        { error: 'Você não pode avaliar este pedido' },
        { status: 403 }
      );
    }

    // Check if order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: 'Apenas pedidos entregues podem ser avaliados' },
        { status: 400 }
      );
    }

    // Check if already rated
    if (order.rating) {
      return NextResponse.json(
        { error: 'Este pedido já foi avaliado' },
        { status: 400 }
      );
    }

    if (!order.deliveryPersonId) {
      return NextResponse.json(
        { error: 'Pedido não possui entregador atribuído' },
        { status: 400 }
      );
    }

    // Create rating
    const newRating = await prisma.rating.create({
      data: {
        orderId,
        clientId: session.user.id,
        deliveryPersonId: order.deliveryPersonId,
        rating,
        comment,
      },
    });

    // Update delivery person average rating
    const deliveryPersonRatings = await prisma.rating.findMany({
      where: { deliveryPersonId: order.deliveryPersonId },
    });

    const averageRating =
      deliveryPersonRatings.reduce((sum, r) => sum + r.rating, 0) /
      deliveryPersonRatings.length;

    await prisma.user.update({
      where: { id: order.deliveryPersonId },
      data: { rating: Number(averageRating.toFixed(2)) },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      orderId: order.id,
      action: 'RATING_CREATED',
      details: `Rating ${rating}/5 for delivery person ${order.deliveryPersonId}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        rating: newRating,
        message: 'Avaliação registrada com sucesso!',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating rating:', error);
    return NextResponse.json(
      { error: 'Erro ao criar avaliação' },
      { status: 500 }
    );
  }
}
