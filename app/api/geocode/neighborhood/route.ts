import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

/**
 * API para geocoding reverso - obtém bairro, cidade e estado a partir de um endereço
 * Usa Mapbox Geocoding API
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { address } = await request.json();

        if (!address || address.trim().length < 5) {
            return NextResponse.json(
                { error: 'Endereço inválido ou muito curto' },
                { status: 400 }
            );
        }

        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

        if (!mapboxToken) {
            return NextResponse.json(
                { error: 'Token do Mapbox não configurado' },
                { status: 500 }
            );
        }

        // Fazer request para Mapbox Geocoding API
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;
        const params = new URLSearchParams({
            access_token: mapboxToken,
            language: 'pt',
            country: 'BR', // Limitar busca ao Brasil
            limit: '1',
        });

        const response = await fetch(`${mapboxUrl}?${params}`);

        if (!response.ok) {
            throw new Error('Erro ao consultar API do Mapbox');
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            return NextResponse.json(
                { error: 'Endereço não encontrado. Verifique se está correto.' },
                { status: 404 }
            );
        }

        const place = data.features[0];
        const context = place.context || [];

        // Extrair informações do contexto
        // neighborhood: bairro
        // place: cidade
        // region: estado
        const neighborhood = context.find((c: any) => c.id.startsWith('neighborhood'))?.text ||
            context.find((c: any) => c.id.startsWith('locality'))?.text ||
            null;
        const city = context.find((c: any) => c.id.startsWith('place'))?.text || null;
        const state = context.find((c: any) => c.id.startsWith('region'))?.text || null;

        // Coordenadas [longitude, latitude]
        const [lng, lat] = place.center;

        return NextResponse.json({
            success: true,
            data: {
                neighborhood,
                city,
                state,
                latitude: lat,
                longitude: lng,
                fullAddress: place.place_name,
            },
        });
    } catch (error) {
        console.error('Error in geocoding API:', error);
        return NextResponse.json(
            { error: 'Erro ao processar endereço' },
            { status: 500 }
        );
    }
}
