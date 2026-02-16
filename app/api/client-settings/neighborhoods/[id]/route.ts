import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// PUT - Atualizar bairro
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { price, isActive } = body;

        // Verificar se o bairro pertence ao usuário
        const neighborhood = await prisma.neighborhoodPricing.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            },
        });

        if (!neighborhood) {
            return NextResponse.json(
                { error: 'Bairro não encontrado' },
                { status: 404 }
            );
        }

        const updateData: any = {};

        if (price !== undefined && price !== null) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return NextResponse.json(
                    { error: 'Preço inválido' },
                    { status: 400 }
                );
            }
            updateData.price = parsedPrice;
        }

        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
        }

        const updated = await prisma.neighborhoodPricing.update({
            where: { id: params.id },
            data: updateData,
        });

        return NextResponse.json({
            message: 'Bairro atualizado com sucesso',
            neighborhood: updated,
        });
    } catch (error) {
        console.error('Error updating neighborhood:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar bairro' },
            { status: 500 }
        );
    }
}

// DELETE - Remover bairro
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Verificar se o bairro pertence ao usuário
        const neighborhood = await prisma.neighborhoodPricing.findFirst({
            where: {
                id: params.id,
                userId: session.user.id,
            },
        });

        if (!neighborhood) {
            return NextResponse.json(
                { error: 'Bairro não encontrado' },
                { status: 404 }
            );
        }

        await prisma.neighborhoodPricing.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            message: 'Bairro removido com sucesso',
        });
    } catch (error) {
        console.error('Error deleting neighborhood:', error);
        return NextResponse.json(
            { error: 'Erro ao remover bairro' },
            { status: 500 }
        );
    }
}
