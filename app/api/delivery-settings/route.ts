import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Buscar dados do entregador
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
                phone: true,
                role: true,
                vehicleType: true,
                licenseNumber: true,
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

        if (user.role !== 'DELIVERY_PERSON') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Error fetching delivery settings:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar configurações' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar dados do entregador (placa e telefone)
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        if (!user || user.role !== 'DELIVERY_PERSON') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const body = await req.json();
        const { licenseNumber, phone } = body;

        const updateData: any = {};

        if (licenseNumber !== undefined) {
            if (licenseNumber && licenseNumber.trim().length < 3) {
                return NextResponse.json(
                    { error: 'Placa inválida' },
                    { status: 400 }
                );
            }
            updateData.licenseNumber = licenseNumber?.trim() || null;
        }

        if (phone !== undefined) {
            if (phone && phone.trim().length < 8) {
                return NextResponse.json(
                    { error: 'Telefone inválido' },
                    { status: 400 }
                );
            }
            updateData.phone = phone?.trim() || null;
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                id: true,
                phone: true,
                licenseNumber: true,
            },
        });

        return NextResponse.json({
            message: 'Configurações atualizadas com sucesso',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating delivery settings:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar configurações' },
            { status: 500 }
        );
    }
}
