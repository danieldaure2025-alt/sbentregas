// Utilitários de geolocalização

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @returns Distância em quilômetros
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Detecta se a localização pode ser falsa (GPS spoofing)
 * Verifica saltos irreais na posição
 */
export function detectFakeGps(
  prevLat: number | null,
  prevLon: number | null,
  prevTimestamp: Date | null,
  currentLat: number,
  currentLon: number,
  currentTimestamp: Date
): { isFake: boolean; reason?: string } {
  if (!prevLat || !prevLon || !prevTimestamp) {
    return { isFake: false };
  }

  const timeDiffSeconds = (currentTimestamp.getTime() - prevTimestamp.getTime()) / 1000;
  
  // Se o tempo for muito pequeno, ignorar
  if (timeDiffSeconds < 1) {
    return { isFake: false };
  }

  const distance = haversineDistance(prevLat, prevLon, currentLat, currentLon);
  const speedKmH = (distance / timeDiffSeconds) * 3600;

  // Velocidade máxima realista: 200 km/h (para motos em estradas)
  // Se a velocidade for maior, provavelmente é GPS falso
  if (speedKmH > 200) {
    return { 
      isFake: true, 
      reason: `Velocidade impossível detectada: ${speedKmH.toFixed(1)} km/h` 
    };
  }

  // Se o salto for maior que 500 metros em menos de 3 segundos
  if (distance > 0.5 && timeDiffSeconds < 3) {
    return { 
      isFake: true, 
      reason: `Salto de posição detectado: ${(distance * 1000).toFixed(0)}m em ${timeDiffSeconds.toFixed(1)}s` 
    };
  }

  return { isFake: false };
}

/**
 * Verifica se a localização está dentro de um raio especificado
 */
export function isWithinRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(lat1, lon1, lat2, lon2) * 1000; // Convert to meters
  return distance <= radiusMeters;
}

/**
 * Constantes de configuração
 */
export const GEO_CONSTANTS = {
  TRACKING_INTERVAL_MS: 3000, // 3 segundos
  OFFER_TIMEOUT_SECONDS: 60,
  MAX_PICKUP_DISTANCE_KM: 10, // Distância máxima para oferecer pedido
  ARRIVAL_RADIUS_METERS: 100, // Raio para considerar "chegou"
  MAX_REJECTIONS_BEFORE_PAUSE: 5,
  REJECTION_PENALTY_POINTS: 10,
  MAX_OFFER_ATTEMPTS: 5, // Máximo de tentativas antes de NO_COURIER_AVAILABLE
};
