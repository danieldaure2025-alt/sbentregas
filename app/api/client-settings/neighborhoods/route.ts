import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Listar bairros configurados do cliente
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const neighborhoods = await prisma.neighborhoodPricing.findMany({
            where: { userId: session.user.id },
            orderBy: { neighborhood: 'asc' },
        });

        return NextResponse.json({ neighborhoods });
    } catch (error) {
        console.error('Error fetching neighborhoods:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar bairros' },
            { status: 500 }
        );
    }
}

// POST - Adicionar novo bairro
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const body = await req.json();
        const { neighborhood, price, platformFee } = body;

        if (!neighborhood || !neighborhood.trim()) {
            return NextResponse.json(
                { error: 'Nome do bairro é obrigatório' },
                { status: 400 }
            );
        }

        if (price === undefined || price === null) {
            return NextResponse.json(
                { error: 'Preço é obrigatório' },
                { status: 400 }
            );
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return NextResponse.json(
                { error: 'Preço inválido' },
                { status: 400 }
            );
        }

        const parsedPlatformFee = platformFee ? parseFloat(platformFee) : 0;
        if (isNaN(parsedPlatformFee) || parsedPlatformFee < 0) {
            return NextResponse.json(
                { error: 'Taxa da plataforma inválida' },
                { status: 400 }
            );
        }

        // Verificar se já existe
        const existing = await prisma.neighborhoodPricing.findUnique({
            where: {
                userId_neighborhood: {
                    userId: session.user.id,
                    neighborhood: neighborhood.trim(),
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Este bairro já está cadastrado' },
                { status: 400 }
            );
        }

        const newNeighborhood = await prisma.neighborhoodPricing.create({
            data: {
                userId: session.user.id,
                neighborhood: neighborhood.trim(),
                price: parsedPrice,
                platformFee: parsedPlatformFee,
                isActive: true,
            },
        });

        return NextResponse.json({
            message: 'Bairro adicionado com sucesso',
            neighborhood: newNeighborhood,
        });
    } catch (error) {
        console.error('Error creating neighborhood:', error);
        return NextResponse.json(
            { error: 'Erro ao adicionar bairro' },
            { status: 500 }
        );
    }
}
