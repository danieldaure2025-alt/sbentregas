import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * API para atualizar informações do estabelecimento
 * Inclui endereço, bairro, cidade, estado e coordenadas
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Verificar se é estabelecimento
        const isEstablishment =
            session.user.role === UserRole.ESTABLISHMENT ||
            (session.user.role === UserRole.CLIENT && session.user.clientType === 'DELIVERY');

        if (!isEstablishment) {
            return NextResponse.json(
                { error: 'Apenas estabelecimentos podem atualizar essas informações' },
                { status: 403 }
            );
        }

        const {
            establishmentAddress,
            establishmentNeighborhood,
            establishmentCity,
            establishmentState,
            establishmentLatitude,
            establishmentLongitude,
        } = await request.json();

        // Atualizar dados do usuário
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                establishmentAddress,
                establishmentNeighborhood,
                establishmentCity,
                establishmentState,
                establishmentLatitude,
                establishmentLongitude,
            },
            select: {
                id: true,
                establishmentAddress: true,
                establishmentNeighborhood: true,
                establishmentCity: true,
                establishmentState: true,
                establishmentLatitude: true,
                establishmentLongitude: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: updatedUser,
        });
    } catch (error) {
        console.error('Error updating establishment info:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar informações' },
            { status: 500 }
        );
    }
}

/**
 * GET - Buscar informações do estabelecimento
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                establishmentAddress: true,
                establishmentNeighborhood: true,
                establishmentCity: true,
                establishmentState: true,
                establishmentLatitude: true,
                establishmentLongitude: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('Error fetching establishment info:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar informações' },
            { status: 500 }
        );
    }
}
