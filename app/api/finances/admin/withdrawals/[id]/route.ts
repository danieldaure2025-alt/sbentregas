import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, WithdrawalStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// PATCH - Approve/Reject withdrawal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Acesso permitido apenas para administradores' },
        { status: 403 }
      );
    }

    const { action, adminNotes } = await req.json();

    if (!action || !['approve', 'reject', 'complete'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Saque não encontrado' },
        { status: 404 }
      );
    }

    let newStatus: WithdrawalStatus;
    let message: string;

    switch (action) {
      case 'approve':
        newStatus = WithdrawalStatus.APPROVED;
        message = 'Saque aprovado com sucesso';
        break;
      case 'reject':
        newStatus = WithdrawalStatus.REJECTED;
        message = 'Saque rejeitado';
        break;
      case 'complete':
        newStatus = WithdrawalStatus.COMPLETED;
        message = 'Saque marcado como concluído';
        break;
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: newStatus,
        adminNotes: adminNotes || null,
        processedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: `WITHDRAWAL_${action.toUpperCase()}`,
      details: `Saque ID ${id} - R$ ${withdrawal.amount.toFixed(2)} - ${message}${adminNotes ? ` - Nota: ${adminNotes}` : ''}`,
    });

    return NextResponse.json({
      success: true,
      message,
      withdrawal: updated,
    });
  } catch (error) {
    console.error('Error updating withdrawal:', error);
    return NextResponse.json(
      { error: 'Erro ao processar saque' },
      { status: 500 }
    );
  }
}
