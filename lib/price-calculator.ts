import { DEFAULT_SYSTEM_SETTINGS } from './constants';
import { prisma } from './db';

// Tipos para coordenadas
export type Coordinates = [number, number]; // [longitude, latitude]

// Geocodificar endereço usando Mapbox
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      console.error('Mapbox token not configured');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=br&limit=1&language=pt`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.features || data.features.length === 0) {
      console.error('Address not found:', address);
      return null;
    }

    const [lng, lat] = data.features[0].center;
    return [lng, lat];
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Calcular rota e distância usando Mapbox Directions API
export async function calculateRouteDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<{ distance: number; duration: number } | null> {
  try {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      console.error('Mapbox token not configured');
      return null;
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?geometries=geojson&overview=full&access_token=${mapboxToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.routes || data.routes.length === 0) {
      console.error('Could not calculate route');
      return null;
    }

    const route = data.routes[0];
    
    return {
      distance: route.distance / 1000, // metros para km
      duration: route.duration / 60, // segundos para minutos
    };
  } catch (error) {
    console.error('Error calculating route:', error);
    return null;
  }
}

export async function calculateOrderPrice(distanceKm: number): Promise<{
  price: number;
  platformFee: number;
  deliveryFee: number;
}> {
  try {
    // Try to get settings from database
    const baseFeeSetting = await prisma.systemConfig.findUnique({
      where: { key: 'BASE_FEE' },
    });
    const pricePerKmSetting = await prisma.systemConfig.findUnique({
      where: { key: 'PRICE_PER_KM' },
    });
    const platformFeeSetting = await prisma.systemConfig.findUnique({
      where: { key: 'PLATFORM_FEE_PERCENTAGE' },
    });

    const baseFee = baseFeeSetting?.value
      ? parseFloat(baseFeeSetting.value)
      : DEFAULT_SYSTEM_SETTINGS.BASE_FEE;
    const pricePerKm = pricePerKmSetting?.value
      ? parseFloat(pricePerKmSetting.value)
      : DEFAULT_SYSTEM_SETTINGS.PRICE_PER_KM;
    const platformFeePercentage = platformFeeSetting?.value
      ? parseFloat(platformFeeSetting.value)
      : DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE;

    const deliveryFee = baseFee + distanceKm * pricePerKm;
    const platformFee = deliveryFee * platformFeePercentage;
    const totalPrice = deliveryFee + platformFee;

    return {
      price: Number(totalPrice.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
    };
  } catch (error) {
    console.error('Error calculating price:', error);
    // Fallback to default settings
    const deliveryFee =
      DEFAULT_SYSTEM_SETTINGS.BASE_FEE +
      distanceKm * DEFAULT_SYSTEM_SETTINGS.PRICE_PER_KM;
    const platformFee = deliveryFee * DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE;
    const totalPrice = deliveryFee + platformFee;

    return {
      price: Number(totalPrice.toFixed(2)),
      platformFee: Number(platformFee.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
    };
  }
}

// Mantido para compatibilidade, mas usar calculateRouteDistance quando possível
export function calculateDistance(origin: string, destination: string): number {
  // Simulated distance calculation - usar geocodeAddress + calculateRouteDistance para precisão real
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  const combined = origin + destination;
  const hashValue = hash(combined);
  const distance = (hashValue % 49) + 1;
  return Number(distance.toFixed(1));
}
