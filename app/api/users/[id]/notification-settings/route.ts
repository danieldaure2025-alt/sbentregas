import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await req.json();
        const { emailNotificationsEnabled } = body;

        if (typeof emailNotificationsEnabled !== 'boolean') {
            return NextResponse.json(
                { error: 'emailNotificationsEnabled deve ser um booleano' },
                { status: 400 }
            );
        }

        const isAdmin = session.user.role === 'ADMIN';
        const isOwnProfile = session.user.id === id;

        if (!isAdmin && !isOwnProfile) {
            return NextResponse.json(
                { error: 'Sem permissão' },
                { status: 403 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { emailNotificationsEnabled },
            select: {
                id: true,
                name: true,
                email: true,
                emailNotificationsEnabled: true,
            },
        });

        return NextResponse.json({
            success: true,
            user: updatedUser,
            message: `Notificações ${emailNotificationsEnabled ? 'habilitadas' : 'desabilitadas'}`,
        });
    } catch (error) {
        console.error('Erro:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar' },
            { status: 500 }
        );
    }
}
