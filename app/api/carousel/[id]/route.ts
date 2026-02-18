import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/s3';
import { UserRole } from '@prisma/client';

// DELETE - Remover imagem do carrossel e do S3
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const image = await prisma.carouselImage.findUnique({
            where: { id: params.id },
        });

        if (!image) {
            return NextResponse.json(
                { error: 'Imagem não encontrada' },
                { status: 404 }
            );
        }

        // Deletar do S3
        try {
            await deleteFile(image.imageKey);
        } catch (s3Error) {
            console.error('Error deleting from S3:', s3Error);
            // Continua mesmo se falhar no S3
        }

        // Deletar do banco
        await prisma.carouselImage.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting carousel image:', error);
        return NextResponse.json(
            { error: 'Erro ao remover imagem do carrossel' },
            { status: 500 }
        );
    }
}

// PATCH - Toggle ativo/inativo
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
        }

        const { isActive } = await req.json();

        const image = await prisma.carouselImage.update({
            where: { id: params.id },
            data: { isActive },
        });

        return NextResponse.json(image);
    } catch (error) {
        console.error('Error updating carousel image:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar imagem' },
            { status: 500 }
        );
    }
}
