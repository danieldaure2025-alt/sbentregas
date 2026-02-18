import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROUTING_KEYS = [
    { key: 'ROUTING_MAX_GROUPING_DISTANCE_KM', label: 'Distância máxima para agrupamento (km)', default: '3' },
    { key: 'ROUTING_MAX_DETOUR_DISTANCE_KM', label: 'Distância máxima de desvio (km)', default: '2' },
    { key: 'ROUTING_MAX_ADDITIONAL_TIME_MIN', label: 'Tempo adicional máximo (min)', default: '10' },
    { key: 'ROUTING_MAX_ORDERS_PER_ROUTE', label: 'Máximo de pedidos por rota', default: '5' },
    { key: 'ROUTING_BEARING_TOLERANCE_DEG', label: 'Tolerância de direção (graus)', default: '45' },
    { key: 'ROUTING_ENABLED', label: 'Roteirização ativada', default: 'true' },
    { key: 'ROUTING_AVG_SPEED_KMH', label: 'Velocidade média (km/h)', default: '30' },
    { key: 'ROUTING_AVG_DELIVERY_TIME_MIN', label: 'Tempo médio por entrega (min)', default: '5' },
];

// GET - Buscar configurações de roteirização
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        if (session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const configs = await prisma.systemConfig.findMany({
            where: {
                key: { in: ROUTING_KEYS.map((k) => k.key) },
            },
        });

        const configMap = new Map(configs.map((c) => [c.key, c.value]));

        const settings = ROUTING_KEYS.map((k) => ({
            key: k.key,
            label: k.label,
            value: configMap.get(k.key) || k.default,
            default: k.default,
        }));

        return NextResponse.json({ settings });
    } catch (error) {
        console.error('Error fetching routing settings:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar configurações de roteirização' },
            { status: 500 }
        );
    }
}

// PUT - Atualizar configurações de roteirização
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        if (session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { error: 'Sem permissão para alterar configurações' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { settings } = body;

        if (!settings || typeof settings !== 'object') {
            return NextResponse.json(
                { error: 'Configurações inválidas' },
                { status: 400 }
            );
        }

        const validKeys = new Set(ROUTING_KEYS.map((k) => k.key));
        const operations = [];

        for (const [key, value] of Object.entries(settings)) {
            if (!validKeys.has(key)) continue;

            const strValue = String(value);

            // Validate numeric values
            if (key !== 'ROUTING_ENABLED') {
                const numValue = parseFloat(strValue);
                if (isNaN(numValue) || numValue < 0) {
                    return NextResponse.json(
                        { error: `Valor inválido para ${key}: ${strValue}` },
                        { status: 400 }
                    );
                }
            }

            operations.push(
                prisma.systemConfig.upsert({
                    where: { key },
                    update: { value: strValue },
                    create: { key, value: strValue },
                })
            );
        }

        if (operations.length > 0) {
            await prisma.$transaction(operations);
        }

        return NextResponse.json({
            success: true,
            message: 'Configurações de roteirização atualizadas',
        });
    } catch (error) {
        console.error('Error updating routing settings:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar configurações' },
            { status: 500 }
        );
    }
}
