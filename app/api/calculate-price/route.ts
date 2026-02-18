import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { calculateOrderPrice, geocodeAddress, calculateRouteDistance } from '@/lib/price-calculator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { originAddress, destinationAddress } = body;

    if (!originAddress || !destinationAddress) {
      return NextResponse.json(
        { error: 'Endereços de origem e destino são obrigatórios' },
        { status: 400 }
      );
    }

    // Geocodificar endereços para obter coordenadas
    const originCoords = await geocodeAddress(originAddress);
    const destCoords = await geocodeAddress(destinationAddress);

    if (!originCoords || !destCoords) {
      return NextResponse.json(
        { error: 'Não foi possível encontrar um ou ambos os endereços. Verifique se os endereços estão corretos.' },
        { status: 400 }
      );
    }

    // Calcular distância real usando API de rotas
    const routeData = await calculateRouteDistance(originCoords, destCoords);
    
    if (!routeData) {
      return NextResponse.json(
        { error: 'Não foi possível calcular a rota entre os endereços' },
        { status: 400 }
      );
    }

    const { distance, duration } = routeData;

    // Calculate price com a distância real
    const { price, platformFee, deliveryFee } = await calculateOrderPrice(distance);

    return NextResponse.json({
      distance: Number(distance.toFixed(2)),
      duration: Number(duration.toFixed(0)),
      price,
      platformFee,
      deliveryFee,
      originCoords,
      destCoords,
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular preço' },
      { status: 500 }
    );
  }
}
