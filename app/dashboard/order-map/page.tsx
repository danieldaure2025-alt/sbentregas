'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/shared/loading';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Map, RefreshCw, Package, Truck, MapPin, Clock, Filter } from 'lucide-react';

interface MapOrder {
    id: string;
    status: string;
    originAddress: string;
    originLatitude: number | null;
    originLongitude: number | null;
    destinationAddress: string;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
    price: number;
    distance: number;
    isScheduled: boolean;
    scheduledAt: string | null;
    createdAt: string;
    client: { id: string; name: string };
    deliveryPerson: { id: string; name: string; currentLatitude: number | null; currentLongitude: number | null } | null;
}

interface DeliveryPerson {
    id: string;
    name: string;
    currentLatitude: number | null;
    currentLongitude: number | null;
    vehicleType: string | null;
    deliveryStatus: string | null;
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b',
    AWAITING_PAYMENT: '#8b5cf6',
    ACCEPTED: '#3b82f6',
    PICKED_UP: '#6366f1',
    IN_TRANSIT: '#8b5cf6',
    DELIVERED: '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Pendente',
    AWAITING_PAYMENT: 'Aguardando Pag.',
    ACCEPTED: 'Aceito',
    PICKED_UP: 'Coletado',
    IN_TRANSIT: 'Em Trânsito',
    DELIVERED: 'Entregue',
};

export default function OrderMapPage() {
    const [orders, setOrders] = useState<MapOrder[]>([]);
    const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    const fetchMapData = useCallback(async () => {
        try {
            const res = await fetch('/api/orders/map');
            if (!res.ok) throw new Error('Erro ao buscar dados');
            const data = await res.json();
            setOrders(data.orders || []);
            setDeliveryPersons(data.deliveryPersons || []);
        } catch (error) {
            console.error('Error fetching map data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Init map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const initMap = async () => {
            const mapboxgl = (await import('mapbox-gl')).default;

            mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

            const map = new mapboxgl.Map({
                container: mapContainerRef.current!,
                style: 'mapbox://styles/mapbox/dark-v11',
                center: [-36.45, -7.05], // São Bento
                zoom: 13,
            });

            map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            mapRef.current = map;
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Fetch data
    useEffect(() => {
        fetchMapData();
    }, [fetchMapData]);

    // Auto refresh
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(fetchMapData, 15000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, fetchMapData]);

    // Update markers
    useEffect(() => {
        if (!mapRef.current) return;

        const updateMarkers = async () => {
            const mapboxgl = (await import('mapbox-gl')).default;

            // Clear existing markers
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            const filteredOrders = statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter);

            // Add order markers
            filteredOrders.forEach(order => {
                // Origin marker
                if (order.originLatitude && order.originLongitude) {
                    const color = STATUS_COLORS[order.status] || '#6b7280';
                    const el = document.createElement('div');
                    el.className = 'order-marker';
                    el.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;font-weight:bold;cursor:pointer;">📦</div>`;

                    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family:system-ui;font-size:13px;padding:4px;">
              <strong>#${order.id.slice(-6)}</strong><br/>
              <span style="color:${color};font-weight:600;">${STATUS_LABELS[order.status] || order.status}</span><br/>
              <strong>R$ ${order.price.toFixed(2)}</strong> · ${order.distance?.toFixed(1)} km<br/>
              <small>🟢 ${order.originAddress.split(',').slice(0, 2).join(',')}</small><br/>
              <small>🔴 ${order.destinationAddress.split(',').slice(0, 2).join(',')}</small><br/>
              <small>Cliente: ${order.client.name}</small>
              ${order.deliveryPerson ? `<br/><small>Entregador: ${order.deliveryPerson.name}</small>` : ''}
              ${order.isScheduled && order.scheduledAt ? `<br/><small>📅 Agendado: ${new Date(order.scheduledAt).toLocaleString('pt-BR')}</small>` : ''}
            </div>
          `);

                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([order.originLongitude, order.originLatitude])
                        .setPopup(popup)
                        .addTo(mapRef.current!);
                    markersRef.current.push(marker);
                }

                // Destination marker (smaller)
                if (order.destinationLatitude && order.destinationLongitude) {
                    const el = document.createElement('div');
                    el.innerHTML = `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`;

                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([order.destinationLongitude, order.destinationLatitude])
                        .addTo(mapRef.current!);
                    markersRef.current.push(marker);
                }
            });

            // Delivery person markers
            deliveryPersons.forEach(dp => {
                if (dp.currentLatitude && dp.currentLongitude) {
                    const el = document.createElement('div');
                    const statusIcon = dp.deliveryStatus === 'ONLINE' ? '🟢' : '🔵';
                    el.innerHTML = `<div style="width:32px;height:32px;border-radius:50%;background:#1d4ed8;border:3px solid #60a5fa;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">${dp.vehicleType === 'CAR' ? '🚗' : '🏍️'}</div>`;

                    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family:system-ui;font-size:13px;padding:4px;">
              <strong>${dp.name}</strong><br/>
              <span>${statusIcon} ${dp.deliveryStatus || 'Online'}</span><br/>
              <small>${dp.vehicleType === 'CAR' ? 'Carro' : 'Moto'}</small>
            </div>
          `);

                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([dp.currentLongitude, dp.currentLatitude])
                        .setPopup(popup)
                        .addTo(mapRef.current!);
                    markersRef.current.push(marker);
                }
            });
        };

        updateMarkers();
    }, [orders, deliveryPersons, statusFilter]);

    const filteredOrders = statusFilter === 'ALL' ? orders : orders.filter(o => o.status === statusFilter);

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'PENDING').length,
        inProgress: orders.filter(o => ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(o.status)).length,
        delivered: orders.filter(o => o.status === 'DELIVERED').length,
        driversOnline: deliveryPersons.length,
    };

    if (loading) return <Loading />;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Map className="w-6 h-6 text-orange-500" />
                    <h1 className="text-2xl font-bold text-white">Mapa de Pedidos</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={autoRefresh ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={autoRefresh ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                        {autoRefresh ? 'Auto' : 'Manual'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchMapData}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Card className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                        <p className="text-xs text-gray-400">Total</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                        <p className="text-xs text-gray-400">Pendentes</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">{stats.inProgress}</p>
                        <p className="text-xs text-gray-400">Em Andamento</p>
                    </CardContent>
                </Card>
                <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">{stats.delivered}</p>
                        <p className="text-xs text-gray-400">Entregues</p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-500/10 border-indigo-500/30">
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-indigo-400">{stats.driversOnline}</p>
                        <p className="text-xs text-gray-400">Entregadores</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {['ALL', 'PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].map(status => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                        className={statusFilter === status ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    >
                        {status === 'ALL' ? 'Todos' : STATUS_LABELS[status] || status}
                    </Button>
                ))}
            </div>

            {/* Map */}
            <Card className="border-gray-700 overflow-hidden">
                <div ref={mapContainerRef} className="w-full" style={{ height: '60vh', minHeight: '400px' }} />
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" /> Pendente
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" /> Aceito
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500" /> Em Trânsito
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" /> Entregue
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-700 border-2 border-blue-400" /> Entregador
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" /> Destino
                </div>
            </div>
        </div>
    );
}
