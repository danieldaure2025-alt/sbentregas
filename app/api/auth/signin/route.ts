import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signin
 * Mobile authentication endpoint - returns JWT token for Bearer auth
 */
export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email e senha são obrigatórios' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: 'Credenciais inválidas' },
                { status: 401 }
            );
        }

        // Check user status
        if (user.status === 'BLOCKED') {
            return NextResponse.json(
                { error: 'Sua conta foi bloqueada. Entre em contato com o suporte.' },
                { status: 403 }
            );
        }

        if (user.status === 'PENDING_APPROVAL') {
            return NextResponse.json(
                { error: 'Sua conta está aguardando aprovação do administrador.' },
                { status: 403 }
            );
        }

        // Generate JWT token
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            console.error('NEXTAUTH_SECRET not configured');
            return NextResponse.json(
                { error: 'Erro interno do servidor' },
                { status: 500 }
            );
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
            },
            secret,
            { expiresIn: '30d' }
        );

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                phone: user.phone,
                image: user.image,
            },
            token,
        });
    } catch (error) {
        console.error('Signin error:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer login. Tente novamente.' },
            { status: 500 }
        );
    }
}
