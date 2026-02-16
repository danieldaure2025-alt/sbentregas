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

    // Buscar configurações do usuário para verificar pricing personalizado
    const { prisma } = await import('@/lib/db');
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        clientType: true,
        pricingType: true,
        fixedDeliveryFee: true,
        neighborhoodPricings: {
          where: { isActive: true },
          select: {
            neighborhood: true,
            price: true,
          },
        },
      },
    });

    let price: number;
    let platformFee: number;
    let deliveryFee: number;

    // Se o cliente é tipo DELIVERY e tem configurações especiais
    if (userData?.clientType === 'DELIVERY') {
      // Opção 1: Taxa fixa do estabelecimento (ignora distância/bairro)
      if (userData.fixedDeliveryFee && userData.fixedDeliveryFee > 0) {
        deliveryFee = userData.fixedDeliveryFee;
        const { DEFAULT_SYSTEM_SETTINGS } = await import('@/lib/constants');
        platformFee = deliveryFee * DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE;
        price = deliveryFee + platformFee;
      }
      // Opção 2: Preço por bairro
      else if (userData.pricingType === 'POR_BAIRRO' && userData.neighborhoodPricings.length > 0) {
        // Extrair bairro do endereço de destino
        const destAddressLower = destinationAddress.toLowerCase();
        let foundNeighborhood = userData.neighborhoodPricings.find((np: { neighborhood: string; price: number }) =>
          destAddressLower.includes(np.neighborhood.toLowerCase())
        );

        if (foundNeighborhood) {
          deliveryFee = foundNeighborhood.price;
          const { DEFAULT_SYSTEM_SETTINGS } = await import('@/lib/constants');
          platformFee = deliveryFee * DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE;
          price = deliveryFee + platformFee;
        } else {
          // Bairro não encontrado, usar cálculo padrão
          const priceData = await calculateOrderPrice(distance);
          price = priceData.price;
          platformFee = priceData.platformFee;
          deliveryFee = priceData.deliveryFee;
        }
      }
      // Opção 3: Cálculo padrão por KM
      else {
        const priceData = await calculateOrderPrice(distance);
        price = priceData.price;
        platformFee = priceData.platformFee;
        deliveryFee = priceData.deliveryFee;
      }
    }
    // Cliente normal: usar cálculo padrão
    else {
      const priceData = await calculateOrderPrice(distance);
      price = priceData.price;
      platformFee = priceData.platformFee;
      deliveryFee = priceData.deliveryFee;
    }

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
