'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loading } from '@/components/shared/loading';
import { MapPin, Navigation, Clock, Route } from 'lucide-react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface DeliveryMapProps {
  originAddress: string;
  destinationAddress: string;
  showRoute?: boolean;
  height?: string;
  deliveryPersonLocation?: { lat: number; lng: number; name?: string } | null;
}

export function DeliveryMap({
  originAddress,
  destinationAddress,
  showRoute = true,
  height = '400px',
  deliveryPersonLocation,
}: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);
  const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);
  const [destCoords, setDestCoords] = useState<Coordinates | null>(null);

  // Geocode an address
  const geocodeAddress = useCallback(async (address: string): Promise<Coordinates | null> => {
    try {
      const response = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.coordinates;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, []);

  // Get route between two points
  const getRoute = useCallback(async (origin: Coordinates, destination: Coordinates) => {
    try {
      const response = await fetch('/api/maps/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination }),
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('Routing error:', err);
      return null;
    }
  }, []);

  // Initialize map and add markers/route
  useEffect(() => {
    const initMap = async () => {
      if (!mapContainer.current) return;

      setLoading(true);
      setError(null);

      try {
        // Geocode both addresses
        const [origin, dest] = await Promise.all([
          geocodeAddress(originAddress),
          geocodeAddress(destinationAddress),
        ]);

        if (!origin || !dest) {
          setError('Não foi possível localizar os endereços no mapa');
          setLoading(false);
          return;
        }

        setOriginCoords(origin);
        setDestCoords(dest);

        // Get Mapbox token
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
          setError('Token do Mapbox não configurado');
          setLoading(false);
          return;
        }

        mapboxgl.accessToken = token;

        // Calculate center and bounds
        const centerLng = (origin.lng + dest.lng) / 2;
        const centerLat = (origin.lat + dest.lat) / 2;

        // Create map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [centerLng, centerLat],
          zoom: 12,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Wait for map to load
        map.current.on('load', async () => {
          if (!map.current) return;

          // Add origin marker (green)
          const originEl = document.createElement('div');
          originEl.className = 'origin-marker';
          originEl.innerHTML = `
            <div style="
              background-color: #22c55e;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `;

          new mapboxgl.Marker(originEl)
            .setLngLat([origin.lng, origin.lat])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Origem</strong><br/>' + originAddress))
            .addTo(map.current!);

          // Add destination marker (red)
          const destEl = document.createElement('div');
          destEl.className = 'dest-marker';
          destEl.innerHTML = `
            <div style="
              background-color: #ef4444;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `;

          new mapboxgl.Marker(destEl)
            .setLngLat([dest.lng, dest.lat])
            .setPopup(new mapboxgl.Popup().setHTML('<strong>Destino</strong><br/>' + destinationAddress))
            .addTo(map.current!);

          // Add delivery person marker (orange) if location is available
          if (deliveryPersonLocation) {
            const dpName = deliveryPersonLocation.name || 'Entregador';
            const dpEl = document.createElement('div');
            dpEl.className = 'delivery-person-marker';
            dpEl.innerHTML = `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
              ">
                <div style="
                  background-color: rgba(0,0,0,0.85);
                  color: white;
                  padding: 4px 10px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: 600;
                  margin-bottom: 4px;
                  white-space: nowrap;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  border: 2px solid #f97316;
                ">
                  ${dpName}
                </div>
                <div style="
                  background-color: #f97316;
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  border: 3px solid white;
                  animation: pulse 2s infinite;
                ">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1z"/>
                    <path d="M5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                  </svg>
                </div>
              </div>
              <style>
                @keyframes pulse {
                  0% { transform: scale(1); }
                  50% { transform: scale(1.1); }
                  100% { transform: scale(1); }
                }
              </style>
            `;

            new mapboxgl.Marker(dpEl)
              .setLngLat([deliveryPersonLocation.lng, deliveryPersonLocation.lat])
              .setPopup(new mapboxgl.Popup().setHTML('<strong>🛵 ' + dpName + '</strong><br/>Em entrega'))
              .addTo(map.current!);
          }

          // Add route if enabled
          if (showRoute) {
            const routeData = await getRoute(origin, dest);
            
            if (routeData && routeData.route) {
              // Add route line
              map.current!.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: routeData.route,
                },
              });

              map.current!.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 5,
                  'line-opacity': 0.8,
                },
              });

              setRouteInfo({
                distance: routeData.distance,
                duration: routeData.duration,
              });
            }
          }

          // Fit bounds to show all markers
          const bounds = new mapboxgl.LngLatBounds()
            .extend([origin.lng, origin.lat])
            .extend([dest.lng, dest.lat]);
          
          if (deliveryPersonLocation) {
            bounds.extend([deliveryPersonLocation.lng, deliveryPersonLocation.lat]);
          }

          map.current!.fitBounds(bounds, {
            padding: 60,
            maxZoom: 15,
          });

          setLoading(false);
        });

        map.current.on('error', (e: mapboxgl.ErrorEvent) => {
          console.error('Map error:', e);
          setError('Erro ao carregar o mapa');
          setLoading(false);
        });
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Erro ao inicializar o mapa');
        setLoading(false);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [originAddress, destinationAddress, showRoute, geocodeAddress, getRoute]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  // Format distance
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  if (error) {
    return (
      <div 
        className="bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-6"
        style={{ height }}
      >
        <MapPin className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-500 text-center">{error}</p>
        <p className="text-sm text-gray-400 mt-2">Os endereços serão exibidos em texto</p>
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
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
            <div className="text-center">
              <Loading />
              <p className="mt-2 text-sm text-gray-500">Carregando mapa...</p>
            </div>
          </div>
        )}
      </div>

      {/* Route Info */}
      {routeInfo && (
        <div className="flex items-center gap-4 text-sm bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Route className="w-4 h-4" />
            <span className="font-medium">{formatDistance(routeInfo.distance)}</span>
          </div>
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Clock className="w-4 h-4" />
            <span className="font-medium">~{formatDuration(routeInfo.duration)}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Origem</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Destino</span>
        </div>
        {deliveryPersonLocation && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Entregador</span>
          </div>
        )}
        {showRoute && (
          <div className="flex items-center gap-1">
            <div className="w-6 h-1 rounded bg-blue-500" />
            <span>Rota</span>
          </div>
        )}
      </div>
    </div>
  );
}
