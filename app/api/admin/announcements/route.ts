import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Listar anúncios
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const isActive = searchParams.get('isActive');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const where: any = {};
        if (isActive !== null && isActive !== '') {
            where.isActive = isActive === 'true';
        }

        const [announcements, total] = await Promise.all([
            prisma.announcement.findMany({
                where,
                include: {
                    admin: {
                        select: { id: true, name: true, email: true },
                    },
                },
                orderBy: { sentAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.announcement.count({ where }),
        ]);

        return NextResponse.json({
            announcements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar anúncios' },
            { status: 500 }
        );
    }
}

// POST - Criar anúncio
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { title, message, imageUrl, targetAudience, isActive, isImportant } = body;

        if (!title || !message || !imageUrl || !targetAudience) {
            return NextResponse.json(
                { error: 'Título, mensagem, imagem e público-alvo são obrigatórios' },
                { status: 400 }
            );
        }

        const announcement = await prisma.announcement.create({
            data: {
                title,
                message,
                imageUrl,
                targetAudience,
                sentBy: session.user.id,
                isActive: isActive !== undefined ? isActive : true,
                isImportant: isImportant !== undefined ? isImportant : false,
            },
            include: {
                admin: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // 📢 NOVA FUNCIONALIDADE: Enviar push automática para entregadores em avisos importantes
        if (isImportant && (targetAudience === 'DELIVERY_PERSONS' || targetAudience === 'ALL')) {
            try {
                // Importação dinâmica para evitar erro se o módulo não existir
                const { sendPushNotificationToMultiple } = await import('@/lib/firebase-admin');

                // Buscar FCM tokens dos entregadores
                const deliveryPersons = await prisma.user.findMany({
                    where: {
                        role: UserRole.DELIVERY_PERSON,
                        fcmToken: { not: null },
                    },
                    select: { fcmToken: true },
                });

                const fcmTokens = deliveryPersons
                    .map((u) => u.fcmToken)
                    .filter((token): token is string => token !== null);

                if (fcmTokens.length > 0) {
                    // Enviar notificação push
                    await sendPushNotificationToMultiple(fcmTokens, {
                        title: `📢 Aviso Importante: ${title}`,
                        body: message,
                        icon: imageUrl,
                    });

                    console.log(`[ANNOUNCEMENT] Push automática enviada para ${fcmTokens.length} entregadores`);
                }
            } catch (pushError) {
                console.error('[ANNOUNCEMENT] Erro ao enviar push automática:', pushError);
                // Não falha a criação do anúncio se o push falhar
            }
        }

        return NextResponse.json({ announcement }, { status: 201 });
    } catch (error) {
        console.error('Error creating announcement:', error);
        return NextResponse.json(
            { error: 'Erro ao criar anúncio' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar anúncio
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { id, title, message, imageUrl, targetAudience, isActive } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'ID do anúncio é obrigatório' },
                { status: 400 }
            );
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (message !== undefined) updateData.message = message;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
        if (isActive !== undefined) updateData.isActive = isActive;

        const announcement = await prisma.announcement.update({
            where: { id },
            data: updateData,
            include: {
                admin: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return NextResponse.json({ announcement });
    } catch (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar anúncio' },
            { status: 500 }
        );
    }
}

// DELETE - Deletar anúncio
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'ID do anúncio é obrigatório' },
                { status: 400 }
            );
        }

        await prisma.announcement.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        return NextResponse.json(
            { error: 'Erro ao deletar anúncio' },
            { status: 500 }
        );
    }
}
