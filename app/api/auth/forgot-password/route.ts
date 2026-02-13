import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

// POST - Solicitar recuperação de senha via CPF/CNPJ
export async function POST(request: NextRequest) {
  try {
    const { documentNumber } = await request.json();

    if (!documentNumber) {
      return NextResponse.json(
        { error: 'CPF ou CNPJ é obrigatório' },
        { status: 400 }
      );
    }

    // Limpar formatação do documento (remover pontos, traços, barras)
    const cleanDocument = documentNumber.replace(/[^\d]/g, '');

    // Buscar usuário pelo documento
    const user = await prisma.user.findFirst({
      where: {
        documentNumber: cleanDocument,
      },
      select: {
        id: true,
        name: true,
        email: true,
        documentNumber: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Nenhum usuário encontrado com este documento' },
        { status: 404 }
      );
    }

    // Gerar token de recuperação
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Mascarar email para mostrar ao usuário
    const maskedEmail = user.email.replace(
      /(.{2})(.*)(@.+)/,
      (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c
    );

    return NextResponse.json({
      success: true,
      message: 'Token de recuperação gerado',
      resetToken, // Em produção, enviar por email/SMS
      maskedEmail,
      userName: user.name,
    });
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
