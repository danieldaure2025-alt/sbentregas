import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/users/profile/password
 * Altera a senha do usuário
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { currentPassword, newPassword, confirmPassword } = body;

        // Validações
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: 'Todos os campos são obrigatórios' },
                { status: 400 }
            );
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'As senhas não coincidem' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'A senha deve ter no mínimo 8 caracteres' },
                { status: 400 }
            );
        }

        // Buscar usuário com senha atual
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                passwordHash: true,
            },
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: 'Usuário não encontrado ou sem senha cadastrada' },
                { status: 404 }
            );
        }

        // Verificar senha atual
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Senha atual incorreta' },
                { status: 401 }
            );
        }

        // Hash da nova senha
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Atualizar senha
        await prisma.user.update({
            where: { id: session.user.id },
            data: { passwordHash: newPasswordHash },
        });

        return NextResponse.json({
            success: true,
            message: 'Senha alterada com sucesso',
        });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        return NextResponse.json(
            { error: 'Erro ao alterar senha' },
            { status: 500 }
        );
    }
}
