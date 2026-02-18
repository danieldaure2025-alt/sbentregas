import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { origin, destination } = body;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Coordenadas de origem e destino são obrigatórias' },
        { status: 400 }
      );
    }

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      return NextResponse.json(
        { error: 'Token Mapbox não configurado' },
        { status: 500 }
      );
    }

    // origin e destination devem ser arrays [lng, lat]
    const originCoords = Array.isArray(origin) ? origin.join(',') : origin;
    const destCoords = Array.isArray(destination) ? destination.join(',') : destination;

    // Usar driving profile para cálculo mais preciso de rotas de carro
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords};${destCoords}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: 'Não foi possível calcular a rota' },
        { status: 400 }
      );
    }

    const route = data.routes[0];
    
    return NextResponse.json({
      distance: route.distance / 1000, // metros para km
      duration: route.duration / 60, // segundos para minutos
      geometry: route.geometry,
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular rota' },
      { status: 500 }
    );
  }
}
