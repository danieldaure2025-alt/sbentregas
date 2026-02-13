'use client';

import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(enabled: boolean = true) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const updateLocation = useCallback(() => {
    if (!enabled || !navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: 'Geolocalização não suportada' }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        let errorMessage = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao buscar localização';
            break;
        }
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    updateLocation();
    
    // Update location every 30 seconds
    const interval = setInterval(updateLocation, 30000);
    
    return () => clearInterval(interval);
  }, [enabled, updateLocation]);

  return { ...state, refresh: updateLocation };
}
