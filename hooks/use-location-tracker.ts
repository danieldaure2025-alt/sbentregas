'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGeolocation } from './use-geolocation';

export function useLocationTracker(enabled: boolean = false) {
  const { latitude, longitude, error, loading, refresh } = useGeolocation(enabled);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    // Only send if location changed significantly (> 10 meters)
    if (lastSentRef.current) {
      const distance = Math.sqrt(
        Math.pow(lat - lastSentRef.current.lat, 2) + 
        Math.pow(lng - lastSentRef.current.lng, 2)
      ) * 111000; // Approximate meters
      if (distance < 10) return;
    }

    try {
      const res = await fetch('/api/users/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      if (res.ok) {
        lastSentRef.current = { lat, lng };
      }
    } catch (err) {
      console.error('Error sending location:', err);
    }
  }, []);

  useEffect(() => {
    if (enabled && latitude && longitude) {
      sendLocation(latitude, longitude);
    }
  }, [enabled, latitude, longitude, sendLocation]);

  return { latitude, longitude, error, loading, refresh };
}
