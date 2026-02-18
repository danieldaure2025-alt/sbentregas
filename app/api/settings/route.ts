import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Buscar configurações atuais
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const configs = await prisma.systemConfig.findMany();
    
    const settings: Record<string, string> = {};
    configs.forEach(config => {
      settings[config.key] = config.value;
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar configurações
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Apenas admin pode alterar configurações
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar configurações' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { baseFee, pricePerKm, platformFeePercentage, extraStopFee } = body;

    // Validar valores
    if (baseFee === undefined || pricePerKm === undefined || platformFeePercentage === undefined) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    if (baseFee < 0 || pricePerKm < 0 || platformFeePercentage < 0 || platformFeePercentage > 100 || (extraStopFee !== undefined && extraStopFee < 0)) {
      return NextResponse.json(
        { error: 'Valores inválidos' },
        { status: 400 }
      );
    }

    // Atualizar ou criar configurações
    const operations = [
      prisma.systemConfig.upsert({
        where: { key: 'BASE_FEE' },
        update: { value: baseFee.toString() },
        create: { key: 'BASE_FEE', value: baseFee.toString() },
      }),
      prisma.systemConfig.upsert({
        where: { key: 'PRICE_PER_KM' },
        update: { value: pricePerKm.toString() },
        create: { key: 'PRICE_PER_KM', value: pricePerKm.toString() },
      }),
      prisma.systemConfig.upsert({
        where: { key: 'PLATFORM_FEE_PERCENTAGE' },
        update: { value: (platformFeePercentage / 100).toString() },
        create: { key: 'PLATFORM_FEE_PERCENTAGE', value: (platformFeePercentage / 100).toString() },
      }),
    ];

    if (extraStopFee !== undefined) {
      operations.push(
        prisma.systemConfig.upsert({
          where: { key: 'EXTRA_STOP_FEE' },
          update: { value: extraStopFee.toString() },
          create: { key: 'EXTRA_STOP_FEE', value: extraStopFee.toString() },
        })
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({ 
      success: true, 
      message: 'Configurações atualizadas com sucesso' 
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configurações' },
      { status: 500 }
    );
  }
}
