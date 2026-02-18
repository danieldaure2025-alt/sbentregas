import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Lista pública de imagens do carrossel (sem auth para exibir no login)
export async function GET() {
  try {
    const images = await prisma.carouselImage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching carousel images:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar imagens do carrossel' },
      { status: 500 }
    );
  }
}

// POST - Adicionar nova imagem (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { imageUrl, imageKey, title } = await req.json();

    if (!imageUrl || !imageKey) {
      return NextResponse.json(
        { error: 'URL e chave da imagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Pegar o maior sortOrder atual
    const maxOrder = await prisma.carouselImage.aggregate({
      _max: { sortOrder: true },
    });

    const image = await prisma.carouselImage.create({
      data: {
        imageUrl,
        imageKey,
        title: title || null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error('Error creating carousel image:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar imagem ao carrossel' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar ordem/estado das imagens (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { images } = await req.json();

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Lista de imagens é obrigatória' },
        { status: 400 }
      );
    }

    // Atualizar posição/estado de cada imagem em transaction
    const operations = images.map((img: { id: string; sortOrder: number; isActive?: boolean }) =>
      prisma.carouselImage.update({
        where: { id: img.id },
        data: {
          sortOrder: img.sortOrder,
          ...(img.isActive !== undefined ? { isActive: img.isActive } : {}),
        },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating carousel images:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar carrossel' },
      { status: 500 }
    );
  }
}
