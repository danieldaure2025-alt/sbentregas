import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET - Buscar configurações do usuário logado
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                documentType: true,
                documentNumber: true,
                // Financial
                pixKeyType: true,
                pixKey: true,
                bankCode: true,
                bankName: true,
                agencyNumber: true,
                accountNumber: true,
                accountType: true,
                accountHolder: true,
                cpfCnpj: true,
                // Establishment / fixed pickup address
                establishmentName: true,
                establishmentAddress: true,
                establishmentLatitude: true,
                establishmentLongitude: true,
                establishmentPhone: true,
                establishmentCnpj: true,
                // Delivery person
                vehicleType: true,
                licenseNumber: true,
                // Billing
                endOfDayBilling: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar configurações' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar configurações do usuário logado
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const userRole = session.user.role as UserRole;

        // Build update data based on role
        const updateData: Record<string, unknown> = {};

        // Fields all roles can update
        const commonFields = [
            'name', 'phone', 'documentType', 'documentNumber',
            'pixKeyType', 'pixKey',
            'bankCode', 'bankName', 'agencyNumber', 'accountNumber',
            'accountType', 'accountHolder', 'cpfCnpj',
        ];

        for (const field of commonFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        // Establishment-specific fields
        if (userRole === UserRole.ESTABLISHMENT) {
            const estFields = [
                'establishmentName', 'establishmentAddress',
                'establishmentLatitude', 'establishmentLongitude',
                'establishmentPhone', 'establishmentCnpj',
            ];
            for (const field of estFields) {
                if (body[field] !== undefined) {
                    updateData[field] = body[field];
                }
            }
        }

        // Client can save fixed pickup address (reuses establishment address fields)
        if (userRole === UserRole.CLIENT) {
            const pickupFields = [
                'establishmentAddress', 'establishmentLatitude', 'establishmentLongitude',
            ];
            for (const field of pickupFields) {
                if (body[field] !== undefined) {
                    updateData[field] = body[field];
                }
            }
        }

        // Delivery person specific fields
        if (userRole === UserRole.DELIVERY_PERSON) {
            const dpFields = ['vehicleType', 'licenseNumber'];
            for (const field of dpFields) {
                if (body[field] !== undefined) {
                    updateData[field] = body[field];
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                documentType: true,
                documentNumber: true,
                pixKeyType: true,
                pixKey: true,
                bankCode: true,
                bankName: true,
                agencyNumber: true,
                accountNumber: true,
                accountType: true,
                accountHolder: true,
                cpfCnpj: true,
                establishmentName: true,
                establishmentAddress: true,
                establishmentLatitude: true,
                establishmentLongitude: true,
                establishmentPhone: true,
                establishmentCnpj: true,
                vehicleType: true,
                licenseNumber: true,
                endOfDayBilling: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Configurações atualizadas com sucesso',
            user,
        });
    } catch (error) {
        console.error('Error updating user settings:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar configurações' },
            { status: 500 }
        );
    }
}
