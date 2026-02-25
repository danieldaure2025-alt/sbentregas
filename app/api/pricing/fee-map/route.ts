import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        // Buscar configurações de preço
        const settings = await prisma.systemConfig.findMany({
            where: {
                key: { in: ['BASE_FEE', 'PRICE_PER_KM', 'PLATFORM_FEE_PERCENTAGE'] },
            },
        });

        const baseFee = parseFloat(settings.find(s => s.key === 'BASE_FEE')?.value || '5');
        const pricePerKm = parseFloat(settings.find(s => s.key === 'PRICE_PER_KM')?.value || '2');
        const platformFeePercent = parseFloat(settings.find(s => s.key === 'PLATFORM_FEE_PERCENTAGE')?.value || '20');

        // Gerar zonas de preço baseadas em distância
        const zones = [
            { minKm: 0, maxKm: 2, label: 'Até 2 km', color: '#22c55e' },
            { minKm: 2, maxKm: 5, label: '2 - 5 km', color: '#84cc16' },
            { minKm: 5, maxKm: 10, label: '5 - 10 km', color: '#eab308' },
            { minKm: 10, maxKm: 15, label: '10 - 15 km', color: '#f97316' },
            { minKm: 15, maxKm: 20, label: '15 - 20 km', color: '#ef4444' },
            { minKm: 20, maxKm: 30, label: '20 - 30 km', color: '#dc2626' },
        ].map(zone => {
            const avgKm = (zone.minKm + zone.maxKm) / 2;
            const deliveryFee = baseFee + avgKm * pricePerKm;
            const platformFee = deliveryFee * (platformFeePercent / 100);
            const totalPrice = deliveryFee + platformFee;
            return {
                ...zone,
                estimatedPrice: Math.round(totalPrice * 100) / 100,
                deliveryFee: Math.round(deliveryFee * 100) / 100,
            };
        });

        return NextResponse.json({
            zones,
            baseFee,
            pricePerKm,
            platformFeePercent,
        });
    } catch (error) {
        console.error('Error fetching fee map:', error);
        return NextResponse.json({ error: 'Erro ao buscar mapa de taxas' }, { status: 500 });
    }
}
