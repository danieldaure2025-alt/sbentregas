import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Buscar chat de um pedido ou listar chats do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      // Buscar chat específico de um pedido
      const chat = await prisma.chat.findUnique({
        where: { orderId },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              clientId: true,
              deliveryPersonId: true,
              establishmentId: true,
            },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, role: true, image: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              sender: {
                select: { id: true, name: true, role: true, image: true },
              },
            },
          },
        },
      });

      if (!chat) {
        return NextResponse.json({ chat: null });
      }

      // Verificar se o usuário tem acesso ao chat
      const isAdmin = session.user.role === UserRole.ADMIN;
      const isParticipant = chat.participants.some(p => p.userId === session.user.id);
      const isOrderOwner = 
        chat.order.clientId === session.user.id ||
        chat.order.deliveryPersonId === session.user.id ||
        chat.order.establishmentId === session.user.id;

      if (!isAdmin && !isParticipant && !isOrderOwner) {
        return NextResponse.json({ error: 'Acesso negado ao chat' }, { status: 403 });
      }

      // Inverter mensagens para ordem cronológica
      chat.messages.reverse();

      return NextResponse.json({ chat });
    }

    // Listar todos os chats do usuário
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId: session.user.id },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            originAddress: true,
            destinationAddress: true,
          },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar chats' },
      { status: 500 }
    );
  }
}

// POST - Criar chat para um pedido
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'ID do pedido é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o pedido existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        clientId: true,
        deliveryPersonId: true,
        establishmentId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verificar se já existe chat
    const existingChat = await prisma.chat.findUnique({
      where: { orderId },
    });

    if (existingChat) {
      return NextResponse.json({ chat: existingChat });
    }

    // Criar chat e adicionar participantes
    const participantIds = [order.clientId];
    if (order.deliveryPersonId) participantIds.push(order.deliveryPersonId);
    if (order.establishmentId) participantIds.push(order.establishmentId);

    // Adicionar admins
    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    admins.forEach(admin => {
      if (!participantIds.includes(admin.id)) {
        participantIds.push(admin.id);
      }
    });

    const chat = await prisma.chat.create({
      data: {
        orderId,
        participants: {
          create: participantIds.map(userId => ({ userId })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, role: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Erro ao criar chat' },
      { status: 500 }
    );
  }
}
