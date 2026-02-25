'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/shared/loading';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { DollarSign, MapPin, Info } from 'lucide-react';

interface PricingZone {
    minKm: number;
    maxKm: number;
    label: string;
    color: string;
    estimatedPrice: number;
    deliveryFee: number;
}

export default function FeeMapPage() {
    const [zones, setZones] = useState<PricingZone[]>([]);
    const [baseFee, setBaseFee] = useState(0);
    const [pricePerKm, setPricePerKm] = useState(0);
    const [loading, setLoading] = useState(true);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/pricing/fee-map');
                if (!res.ok) throw new Error('Erro ao buscar dados');
                const data = await res.json();
                setZones(data.zones || []);
                setBaseFee(data.baseFee || 0);
                setPricePerKm(data.pricePerKm || 0);
            } catch (error) {
                toast({ title: 'Erro', description: 'Erro ao carregar mapa de taxas', variant: 'destructive' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [toast]);

    // Init map with circles
    useEffect(() => {
        if (!mapContainerRef.current || zones.length === 0) return;

        const initMap = () => {
            mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

            // Center on São Bento (approximate)
            const centerLng = -36.45;
            const centerLat = -7.05;

            if (mapRef.current) {
                mapRef.current.remove();
            }

            const map = new mapboxgl.Map({
                container: mapContainerRef.current!,
                style: 'mapbox://styles/mapbox/dark-v11',
                center: [centerLng, centerLat],
                zoom: 11,
            });

            map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            map.on('load', () => {
                // Draw concentric circles for each zone (largest first)
                const reversedZones = [...zones].reverse();
                reversedZones.forEach((zone, index) => {
                    const radiusMeters = zone.maxKm * 1000;
                    const steps = 64;
                    const coordinates: [number, number][] = [];

                    for (let i = 0; i <= steps; i++) {
                        const angle = (i / steps) * 2 * Math.PI;
                        const dx = radiusMeters * Math.cos(angle);
                        const dy = radiusMeters * Math.sin(angle);
                        const lng = centerLng + (dx / (111320 * Math.cos(centerLat * Math.PI / 180)));
                        const lat = centerLat + (dy / 110540);
                        coordinates.push([lng, lat]);
                    }

                    map.addSource(`zone-${zone.maxKm}`, {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'Polygon',
                                coordinates: [coordinates],
                            },
                        },
                    });

                    map.addLayer({
                        id: `zone-fill-${zone.maxKm}`,
                        type: 'fill',
                        source: `zone-${zone.maxKm}`,
                        paint: {
                            'fill-color': zone.color,
                            'fill-opacity': 0.15,
                        },
                    });

                    map.addLayer({
                        id: `zone-line-${zone.maxKm}`,
                        type: 'line',
                        source: `zone-${zone.maxKm}`,
                        paint: {
                            'line-color': zone.color,
                            'line-width': 2,
                            'line-opacity': 0.6,
                        },
                    });
                });

                // Center pin
                new mapboxgl.Marker({ color: '#f97316' })
                    .setLngLat([centerLng, centerLat])
                    .setPopup(new mapboxgl.Popup().setHTML('<strong>Centro de Referência</strong>'))
                    .addTo(map);
            });

            mapRef.current = map;
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [zones]);

    if (loading) return <Loading />;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <MapPin className="w-6 h-6 text-orange-500" />
                <h1 className="text-2xl font-bold text-white">Mapa de Taxas</h1>
            </div>

            <p className="text-sm text-gray-400">
                Veja as estimativas de preço com base na distância da entrega. Os valores são aproximados e podem variar.
            </p>

            {/* Map */}
            <Card className="border-gray-700 overflow-hidden">
                <div ref={mapContainerRef} className="w-full" style={{ height: '50vh', minHeight: '350px' }} />
            </Card>

            {/* Pricing info */}
            <Card className="border-gray-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        Tabela de Preços por Distância
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Taxa base: R$ {baseFee.toFixed(2)} + R$ {pricePerKm.toFixed(2)}/km
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2">
                        {zones.map(zone => (
                            <div
                                key={zone.label}
                                className="flex items-center justify-between p-3 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
                                    <div>
                                        <p className="text-sm font-medium text-white">{zone.label}</p>
                                        <p className="text-xs text-gray-500">{zone.minKm} - {zone.maxKm} km</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold" style={{ color: zone.color }}>
                                        R$ {zone.estimatedPrice.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-500">preço estimado</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Info */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300">
                    Os preços são estimativas baseadas na distância em linha reta. O valor final pode variar
                    conforme a rota real calculada no momento do pedido.
                </p>
            </div>
        </div>
    );
}
