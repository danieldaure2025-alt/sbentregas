import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// PUT - Atualizar dados bancários (PIX/TED)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.DELIVERY_PERSON) {
      return NextResponse.json(
        { error: 'Acesso permitido apenas para entregadores' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const {
      pixKeyType,
      pixKey,
      bankCode,
      bankName,
      agencyNumber,
      accountNumber,
      accountType,
      accountHolder,
      cpfCnpj,
    } = data;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pixKeyType: pixKeyType || null,
        pixKey: pixKey || null,
        bankCode: bankCode || null,
        bankName: bankName || null,
        agencyNumber: agencyNumber || null,
        accountNumber: accountNumber || null,
        accountType: accountType || null,
        accountHolder: accountHolder || null,
        cpfCnpj: cpfCnpj || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dados bancários atualizados com sucesso!',
    });
  } catch (error) {
    console.error('Error updating bank data:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar dados bancários' },
      { status: 500 }
    );
  }
}
