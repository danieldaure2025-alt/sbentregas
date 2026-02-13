'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loading } from '@/components/shared/loading';
import { MapPin } from 'lucide-react';

interface DeliveryPerson {
  id: string;
  name: string;
  currentLatitude?: number;
  currentLongitude?: number;
  isOnline: boolean;
  ordersAsDeliveryPerson: Array<{
    id: string;
    status: string;
  }>;
}

interface DeliveryPersonsMapProps {
  deliveryPersons: DeliveryPerson[];
  height?: string;
}

export default function DeliveryPersonsMap({
  deliveryPersons,
  height = '400px',
}: DeliveryPersonsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError('Token do Mapbox não configurado');
      setLoading(false);
      return;
    }

    mapboxgl.accessToken = token;

    // Filter to only those with valid coordinates
    const withCoords = deliveryPersons.filter(
      p => p.currentLatitude && p.currentLongitude
    );

    if (withCoords.length === 0) {
      setError('Nenhum entregador com localização ativa');
      setLoading(false);
      return;
    }

    // Calculate center
    const lats = withCoords.map(p => p.currentLatitude!);
    const lngs = withCoords.map(p => p.currentLongitude!);
    const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    // Create map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [centerLng, centerLat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Clear existing markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add markers for each delivery person
      withCoords.forEach(person => {
        const isBusy = person.ordersAsDeliveryPerson.length > 0;
        const color = isBusy ? '#eab308' : '#22c55e'; // yellow if busy, green if available

        const el = document.createElement('div');
        el.className = 'delivery-person-marker';
        el.innerHTML = `
          <div style="
            background-color: ${color};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 3px solid white;
            animation: pulse 2s infinite;
            cursor: pointer;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M19 7h-3V6a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm-9-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4V6z"/>
            </svg>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          </style>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${person.name || 'Sem nome'}</strong>
            <div style="margin-top: 4px; font-size: 12px; color: ${isBusy ? '#eab308' : '#22c55e'};">
              ${isBusy ? '📦 Em entrega' : '✅ Disponível'}
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([person.currentLongitude!, person.currentLatitude!])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (withCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        withCoords.forEach(p => {
          bounds.extend([p.currentLongitude!, p.currentLatitude!]);
        });
        map.current!.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }

      setLoading(false);
    });

    map.current.on('error', (e: mapboxgl.ErrorEvent) => {
      console.error('Map error:', e);
      setError('Erro ao carregar o mapa');
      setLoading(false);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [deliveryPersons]);

  if (error) {
    return (
      <div
        className="bg-gray-800 rounded-lg flex flex-col items-center justify-center p-6"
        style={{ height }}
      >
        <MapPin className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-400 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={mapContainer}
        className="rounded-lg overflow-hidden border shadow-sm relative"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
            <div className="text-center">
              <Loading />
              <p className="mt-2 text-sm text-gray-400">Carregando mapa...</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Em entrega</span>
        </div>
      </div>
    </div>
  );
}
