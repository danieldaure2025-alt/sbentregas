import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendPushNotificationToMultiple } from '@/lib/firebase-admin';
import { LinkType, NotificationCategory, TargetAudience, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Buscar anúncios
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('activeOnly') !== 'false'; // default true
        const includeExpired = searchParams.get('includeExpired') === 'true';

        const where: any = {};

        if (activeOnly) {
            where.isActive = true;
        }

        if (!includeExpired) {
            where.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
            ];
        }

        const announcements = await prisma.announcement.findMany({
            where,
            orderBy: [
                { isImportant: 'desc' },
                { sentAt: 'desc' },
            ],
        });

        return NextResponse.json({ announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar anúncios' },
            { status: 500 }
        );
    }
}

// POST - Criar anúncio (admin only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }

        const body = await request.json();
        const {
            title,
            message,
            imageUrl,
            targetAudience = 'ALL',
            linkUrl,
            linkType,
            type = 'INFORMATIVA',
            isImportant = false,
            expiresAt,
            sendPush = false,
        } = body;

        if (!title || !message) {
            return NextResponse.json(
                { error: 'Título e mensagem são obrigatórios' },
                { status: 400 }
            );
        }

        // Criar anúncio
        const announcement = await prisma.announcement.create({
            data: {
                title,
                message,
                imageUrl: imageUrl || null,
                targetAudience: targetAudience as TargetAudience,
                linkUrl: linkUrl || null,
                linkType: (linkType as LinkType) || null,
                type: type as NotificationCategory,
                isImportant,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                createdBy: session.user.id,
            },
        });

        // Se marcado como importante ou sendPush, enviar push notification
        let pushResult = { successCount: 0, failureCount: 0 };

        if (isImportant || sendPush) {
            // Determinar públicos-alvo
            const targetRoles: UserRole[] = [];
            switch (targetAudience) {
                case 'CLIENTS':
                    targetRoles.push(UserRole.CLIENT);
                    break;
                case 'DELIVERY_PERSONS':
                    targetRoles.push(UserRole.DELIVERY_PERSON);
                    break;
                case 'ESTABLISHMENTS':
                    targetRoles.push(UserRole.ESTABLISHMENT);
                    break;
                case 'ALL':
                    targetRoles.push(UserRole.CLIENT, UserRole.DELIVERY_PERSON, UserRole.ESTABLISHMENT);
                    break;
            }

            const users = await prisma.user.findMany({
                where: {
                    role: { in: targetRoles },
                    status: 'ACTIVE',
                    fcmToken: { not: null },
                },
                select: { fcmToken: true },
            });

            const fcmTokens = users
                .map(u => u.fcmToken)
                .filter((t): t is string => t !== null);

            if (fcmTokens.length > 0) {
                pushResult = await sendPushNotificationToMultiple(fcmTokens, {
                    title: isImportant ? `📢 ${title}` : title,
                    body: message.substring(0, 200),
                    data: {
                        type: 'ANNOUNCEMENT',
                        announcementId: announcement.id,
                        ...(imageUrl && { imageUrl }),
                        ...(linkUrl && { linkUrl }),
                        ...(linkType && { linkType }),
                        category: type,
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            announcement,
            pushSent: pushResult.successCount,
            pushFailed: pushResult.failureCount,
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        return NextResponse.json(
            { error: 'Erro ao criar anúncio' },
            { status: 500 }
        );
    }
}

// PATCH - Atualizar anúncio (ativar/desativar)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }

        const { id, isActive, ...updateData } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'ID do anúncio é obrigatório' },
                { status: 400 }
            );
        }

        const data: any = {};
        if (isActive !== undefined) data.isActive = isActive;
        if (updateData.title) data.title = updateData.title;
        if (updateData.message) data.message = updateData.message;
        if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl;
        if (updateData.linkUrl !== undefined) data.linkUrl = updateData.linkUrl;
        if (updateData.linkType !== undefined) data.linkType = updateData.linkType;
        if (updateData.isImportant !== undefined) data.isImportant = updateData.isImportant;
        if (updateData.expiresAt !== undefined) data.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;

        const announcement = await prisma.announcement.update({
            where: { id },
            data,
        });

        return NextResponse.json({ success: true, announcement });
    } catch (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar anúncio' },
            { status: 500 }
        );
    }
}

// DELETE - Excluir anúncio
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
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
            { error: 'Erro ao excluir anúncio' },
            { status: 500 }
        );
    }
}
