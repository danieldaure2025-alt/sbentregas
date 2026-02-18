import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, WithdrawalStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// GET - Admin: Listar todos os saques pendentes
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Acesso permitido apenas para administradores' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') as WithdrawalStatus | null;

    const withdrawals = await prisma.withdrawal.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar saques' },
      { status: 500 }
    );
  }
}

// PATCH - Admin: Aprovar/Rejeitar/Completar saque
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Acesso permitido apenas para administradores' },
        { status: 403 }
      );
    }

    const { withdrawalId, status, adminNotes } = await req.json();

    if (!withdrawalId || !status) {
      return NextResponse.json(
        { error: 'ID do saque e status são obrigatórios' },
        { status: 400 }
      );
    }

    const validStatuses = ['APPROVED', 'COMPLETED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: status as WithdrawalStatus,
        adminNotes: adminNotes || null,
        processedAt: ['COMPLETED', 'REJECTED'].includes(status) ? new Date() : null,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: `WITHDRAWAL_${status}`,
      details: `Saque de R$ ${withdrawal.amount.toFixed(2)} para ${withdrawal.user.name} foi ${status === 'APPROVED' ? 'aprovado' : status === 'COMPLETED' ? 'completado' : 'rejeitado'}`,
    });

    return NextResponse.json({
      success: true,
      message: `Saque ${status === 'APPROVED' ? 'aprovado' : status === 'COMPLETED' ? 'completado' : 'rejeitado'} com sucesso!`,
      withdrawal,
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar saque' },
      { status: 500 }
    );
  }
}
