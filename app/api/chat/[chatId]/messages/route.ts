import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, MessageType } from '@prisma/client';
import { sendPushNotification } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

// GET - Buscar mensagens de um chat
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { chatId } = params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Verificar acesso ao chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: { select: { userId: true } },
        order: {
          select: { clientId: true, deliveryPersonId: true, establishmentId: true },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }

    const isAdmin = session.user.role === UserRole.ADMIN;
    const isParticipant = chat.participants.some(p => p.userId === session.user.id);
    const isOrderOwner = 
      chat.order.clientId === session.user.id ||
      chat.order.deliveryPersonId === session.user.id ||
      chat.order.establishmentId === session.user.id;

    if (!isAdmin && !isParticipant && !isOrderOwner) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar mensagens
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        sender: {
          select: { id: true, name: true, role: true, image: true },
        },
      },
    });

    // Marcar mensagens como lidas
    await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: session.user.id },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Atualizar lastReadAt do participante
    await prisma.chatParticipant.updateMany({
      where: {
        chatId,
        userId: session.user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    messages.reverse();

    return NextResponse.json({
      messages,
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? messages[0].id : null,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}

// POST - Enviar mensagem
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { chatId } = params;
    const { content, type = 'TEXT', imageUrl, imageKey } = await request.json();

    if (!content && type === 'TEXT') {
      return NextResponse.json(
        { error: 'Conteúdo da mensagem é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar acesso ao chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, fcmToken: true },
            },
          },
        },
        order: {
          select: { id: true, clientId: true, deliveryPersonId: true, establishmentId: true },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }

    const isAdmin = session.user.role === UserRole.ADMIN;
    const isParticipant = chat.participants.some(p => p.userId === session.user.id);
    const isOrderOwner = 
      chat.order.clientId === session.user.id ||
      chat.order.deliveryPersonId === session.user.id ||
      chat.order.establishmentId === session.user.id;

    if (!isAdmin && !isParticipant && !isOrderOwner) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Criar mensagem
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: session.user.id,
        type: type as MessageType,
        content: content || '',
        imageUrl,
        imageKey,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, image: true },
        },
      },
    });

    // Atualizar timestamp do chat
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Enviar notificação push para outros participantes
    const otherParticipants = chat.participants.filter(
      p => p.userId !== session.user.id && p.user.fcmToken
    );

    for (const participant of otherParticipants) {
      if (participant.user.fcmToken) {
        try {
          await sendPushNotification(participant.user.fcmToken, {
            title: `💬 Mensagem de ${session.user.name || 'Usuário'}`,
            body: type === 'IMAGE' ? '📷 Enviou uma imagem' : content.substring(0, 100),
            data: {
              type: 'CHAT_MESSAGE',
              chatId,
              orderId: chat.order.id,
            },
          });
        } catch (pushError) {
          console.error('Error sending chat push notification:', pushError);
        }
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}
