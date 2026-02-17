import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar configurações do cliente
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        clientType: true,
        pricingType: true,
        fixedDeliveryFee: true,
        platformFeePercentage: true,
        establishmentName: true,
        establishmentAddress: true,
        establishmentNeighborhood: true,
        establishmentCity: true,
        establishmentState: true,
        establishmentLatitude: true,
        establishmentLongitude: true,
        establishmentPhone: true,
        establishmentCnpj: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching client settings:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configurações do cliente
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      pricingType,
      fixedDeliveryFee,
      establishmentAddress,
      establishmentNeighborhood,
      establishmentCity,
      establishmentState,
      establishmentLatitude,
      establishmentLongitude,
    } = body;

    // Validar entrada
    if (pricingType && !['POR_KM', 'POR_BAIRRO'].includes(pricingType)) {
      return NextResponse.json(
        { error: 'Tipo de precificação inválido' },
        { status: 400 }
      );
    }

    if (fixedDeliveryFee !== undefined && fixedDeliveryFee !== null) {
      const fee = parseFloat(fixedDeliveryFee);
      if (isNaN(fee) || fee < 0) {
        return NextResponse.json(
          { error: 'Taxa fixa inválida' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pricingType: pricingType || undefined,
        fixedDeliveryFee: fixedDeliveryFee !== undefined ? parseFloat(fixedDeliveryFee) : undefined,
        establishmentAddress: establishmentAddress !== undefined ? establishmentAddress : undefined,
        establishmentNeighborhood: establishmentNeighborhood !== undefined ? establishmentNeighborhood : undefined,
        establishmentCity: establishmentCity !== undefined ? establishmentCity : undefined,
        establishmentState: establishmentState !== undefined ? establishmentState : undefined,
        establishmentLatitude: establishmentLatitude !== undefined ? establishmentLatitude : undefined,
        establishmentLongitude: establishmentLongitude !== undefined ? establishmentLongitude : undefined,
      },
      select: {
        id: true,
        pricingType: true,
        fixedDeliveryFee: true,
      },
    });

    return NextResponse.json({
      message: 'Configurações atualizadas com sucesso',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating client settings:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
