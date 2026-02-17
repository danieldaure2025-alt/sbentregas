import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings
 * Busca configurações da plataforma (apenas ADMIN)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { error: 'Acesso negado' },
                { status: 403 }
            );
        }

        const settings = await prisma.appSettings.findFirst();

        // Se não existir, retorna configurações vazias
        if (!settings) {
            return NextResponse.json({
                pixKeyType: '',
                pixKey: '',
                pixAccountName: '',
                platformName: '',
                supportEmail: '',
                supportPhone: '',
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar configurações' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/settings
 * Atualiza configurações da plataforma (apenas ADMIN)
 */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { error: 'Acesso negado' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const {
            pixKeyType,
            pixKey,
            pixAccountName,
            platformName,
            supportEmail,
            supportPhone,
        } = body;

        // Buscar configuração existente
        const existing = await prisma.appSettings.findFirst();

        let settings;

        if (existing) {
            // Atualizar existente
            settings = await prisma.appSettings.update({
                where: { id: existing.id },
                data: {
                    pixKeyType,
                    pixKey,
                    pixAccountName,
                    platformName,
                    supportEmail,
                    supportPhone,
                },
            });
        } else {
            // Criar novo
            settings = await prisma.appSettings.create({
                data: {
                    pixKeyType,
                    pixKey,
                    pixAccountName,
                    platformName,
                    supportEmail,
                    supportPhone,
                },
            });
        }

        return NextResponse.json({
            success: true,
            settings,
            message: 'Configurações salvas com sucesso',
        });
    } catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar configurações' },
            { status: 500 }
        );
    }
}
