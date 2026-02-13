import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'Endereço é obrigatório' }, { status: 400 });
    }

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      return NextResponse.json({ error: 'Mapbox não configurado' }, { status: 500 });
    }

    // Geocode the address using Mapbox API
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=BR&limit=1`
    );

    if (!response.ok) {
      throw new Error('Erro ao geocodificar endereço');
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({ 
        error: 'Endereço não encontrado',
        coordinates: null 
      }, { status: 404 });
    }

    const [lng, lat] = data.features[0].center;

    return NextResponse.json({
      coordinates: { lng, lat },
      placeName: data.features[0].place_name,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Erro ao geocodificar endereço' },
      { status: 500 }
    );
  }
}
