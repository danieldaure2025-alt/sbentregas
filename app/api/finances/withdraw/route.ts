import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, PaymentStatus, OrderStatus, WithdrawalMethod } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// POST - Solicitar saque
export async function POST(req: NextRequest) {
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

    const { amount, method } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valor de saque inválido' },
        { status: 400 }
      );
    }

    if (!method || !['PIX', 'TED'].includes(method)) {
      return NextResponse.json(
        { error: 'Método de saque inválido' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Buscar dados bancários do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pixKeyType: true,
        pixKey: true,
        bankCode: true,
        bankName: true,
        agencyNumber: true,
        accountNumber: true,
        accountType: true,
        accountHolder: true,
        cpfCnpj: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Validar dados bancários baseado no método
    if (method === 'PIX' && !user.pixKey) {
      return NextResponse.json(
        { error: 'Cadastre sua chave PIX antes de solicitar saque via PIX' },
        { status: 400 }
      );
    }

    if (method === 'TED' && (!user.bankCode || !user.agencyNumber || !user.accountNumber)) {
      return NextResponse.json(
        { error: 'Cadastre seus dados bancários antes de solicitar saque via TED' },
        { status: 400 }
      );
    }

    // Calcular saldo disponível
    const deliveries = await prisma.order.findMany({
      where: {
        deliveryPersonId: userId,
        status: OrderStatus.DELIVERED,
      },
      include: {
        transactions: {
          where: { paymentStatus: PaymentStatus.COMPLETED },
        },
      },
    });

    const totalEarnings = deliveries.reduce((sum, order) => {
      const tx = order.transactions[0];
      return sum + (tx?.deliveryFee || 0);
    }, 0);

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'APPROVED', 'PENDING'] },
      },
    });

    const withdrawnAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const availableBalance = totalEarnings - withdrawnAmount;

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Criar solicitação de saque
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount,
        method: method as WithdrawalMethod,
        ...(method === 'PIX'
          ? {
              pixKeyType: user.pixKeyType,
              pixKey: user.pixKey,
            }
          : {
              bankCode: user.bankCode,
              bankName: user.bankName,
              agencyNumber: user.agencyNumber,
              accountNumber: user.accountNumber,
              accountType: user.accountType,
              accountHolder: user.accountHolder,
              cpfCnpj: user.cpfCnpj,
            }),
      },
    });

    await createAuditLog({
      userId,
      action: 'WITHDRAWAL_REQUESTED',
      details: `Saque de R$ ${amount.toFixed(2)} via ${method} solicitado`,
    });

    return NextResponse.json({
      success: true,
      message: 'Saque solicitado com sucesso! Aguarde aprovação.',
      withdrawal,
    });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json(
      { error: 'Erro ao solicitar saque' },
      { status: 500 }
    );
  }
}
