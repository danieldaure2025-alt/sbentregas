import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.pushNotification.findMany({
                include: {
                    admin: {
                        select: { id: true, name: true, email: true },
                    },
                },
                orderBy: { sentAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.pushNotification.count(),
        ]);

        return NextResponse.json({
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching notification history:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar histórico' },
            { status: 500 }
        );
    }
}
