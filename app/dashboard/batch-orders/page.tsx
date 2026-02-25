'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loading } from '@/components/shared/loading';
import { Layers, RefreshCw, Package, UserCheck, Check, MapPin, Truck } from 'lucide-react';

interface OrderItem {
    id: string;
    originAddress: string;
    destinationAddress: string;
    price: number;
    distance: number;
    createdAt: string;
    client: { id: string; name: string };
}

interface Suggestion {
    orderIds: string[];
    orders: OrderItem[];
    totalPrice: number;
    totalDistance: number;
    avgOriginDistance: number;
}

interface Batch {
    batchId: string;
    orderCount: number;
    deliveryPerson: { id: string; name: string } | null;
    totalPrice: number;
    totalDistance: number;
    orders: Array<OrderItem & { batchOrder: number; status: string; deliveryPerson: any }>;
}

interface DeliveryPerson {
    id: string;
    name: string;
}

export default function BatchOrdersPage() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [pendingOrders, setPendingOrders] = useState<OrderItem[]>([]);
    const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
    const [selectedDriver, setSelectedDriver] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [tab, setTab] = useState<'suggestions' | 'manual' | 'active'>('suggestions');
    const { toast } = useToast();

    const fetchData = useCallback(async () => {
        try {
            const [suggestRes, batchRes, ordersRes, driversRes] = await Promise.all([
                fetch('/api/orders/batch/suggest'),
                fetch('/api/orders/batch'),
                fetch('/api/orders?status=PENDING&limit=50'),
                fetch('/api/users/delivery-persons'),
            ]);

            if (suggestRes.ok) {
                const data = await suggestRes.json();
                setSuggestions(data.suggestions || []);
            }
            if (batchRes.ok) {
                const data = await batchRes.json();
                setBatches(data.batches || []);
            }
            if (ordersRes.ok) {
                const data = await ordersRes.json();
                setPendingOrders(data.orders || []);
            }
            if (driversRes.ok) {
                const data = await driversRes.json();
                setDeliveryPersons(data.deliveryPersons || data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const createBatch = async (orderIds: string[], driverId: string) => {
        setCreating(true);
        try {
            const res = await fetch('/api/orders/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds, deliveryPersonId: driverId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast({ title: 'Lote criado!', description: `${orderIds.length} pedidos agrupados` });
            setSelectedOrders(new Set());
            setSelectedDriver('');
            fetchData();
        } catch (error: any) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        } finally {
            setCreating(false);
        }
    };

    const toggleOrder = (id: string) => {
        const next = new Set(selectedOrders);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedOrders(next);
    };

    if (loading) return <Loading />;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-6 h-6 text-orange-500" />
                    <h1 className="text-2xl font-bold text-white">Agrupar Pedidos</h1>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {(['suggestions', 'manual', 'active'] as const).map(t => (
                    <Button
                        key={t}
                        variant={tab === t ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTab(t)}
                        className={tab === t ? 'bg-orange-500 hover:bg-orange-600' : ''}
                    >
                        {t === 'suggestions' ? `Sugestões (${suggestions.length})` :
                            t === 'manual' ? 'Agrupar Manual' :
                                `Lotes Ativos (${batches.length})`}
                    </Button>
                ))}
            </div>

            {/* === TAB: Sugestões === */}
            {tab === 'suggestions' && (
                <div className="space-y-3">
                    {suggestions.length === 0 ? (
                        <Card className="border-gray-700">
                            <CardContent className="p-6 text-center text-gray-400">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma sugestão de agrupamento no momento.</p>
                                <p className="text-xs mt-1">Precisa de ao menos 2 pedidos pendentes com origens próximas (até 3km).</p>
                            </CardContent>
                        </Card>
                    ) : (
                        suggestions.map((s, idx) => (
                            <Card key={idx} className="border-gray-700 hover:border-orange-500/40 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-white text-base flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-orange-400" />
                                            {s.orderIds.length} pedidos agrupáveis
                                        </CardTitle>
                                        <span className="text-xs text-gray-400">
                                            ~{s.avgOriginDistance.toFixed(1)}km entre origens
                                        </span>
                                    </div>
                                    <CardDescription className="text-gray-400">
                                        Total: R$ {s.totalPrice.toFixed(2)} · {s.totalDistance.toFixed(1)} km
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {s.orders.map(order => (
                                        <div key={order.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-800/50">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white truncate">#{order.id.slice(-6)} — {order.client.name}</p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    <MapPin className="w-3 h-3 inline" /> {order.originAddress.split(',').slice(0, 2).join(',')}
                                                </p>
                                            </div>
                                            <span className="text-green-400 font-medium ml-2">R$ {order.price.toFixed(2)}</span>
                                        </div>
                                    ))}

                                    {/* Selecionar entregador e criar */}
                                    <div className="flex gap-2 mt-2">
                                        <select
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                                            value={selectedDriver}
                                            onChange={e => setSelectedDriver(e.target.value)}
                                        >
                                            <option value="">Selecione o entregador</option>
                                            {deliveryPersons.map(dp => (
                                                <option key={dp.id} value={dp.id}>{dp.name}</option>
                                            ))}
                                        </select>
                                        <Button
                                            size="sm"
                                            disabled={!selectedDriver || creating}
                                            onClick={() => createBatch(s.orderIds, selectedDriver)}
                                            className="bg-orange-500 hover:bg-orange-600"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Agrupar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* === TAB: Manual === */}
            {tab === 'manual' && (
                <div className="space-y-3">
                    <Card className="border-gray-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-white text-base">Selecione os pedidos</CardTitle>
                            <CardDescription className="text-gray-400">
                                Escolha 2 ou mais pedidos pendentes para agrupar
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
                            {pendingOrders.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Nenhum pedido pendente</p>
                            ) : (
                                pendingOrders.map(order => (
                                    <div
                                        key={order.id}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedOrders.has(order.id)
                                                ? 'bg-orange-500/20 border border-orange-500/40'
                                                : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                                            }`}
                                        onClick={() => toggleOrder(order.id)}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedOrders.has(order.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
                                            }`}>
                                            {selectedOrders.has(order.id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm truncate">#{order.id.slice(-6)} — {order.client?.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{order.originAddress?.split(',').slice(0, 2).join(',')}</p>
                                        </div>
                                        <span className="text-green-400 text-sm font-medium">R$ {order.price?.toFixed(2)}</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* Ação */}
                    {selectedOrders.size >= 2 && (
                        <Card className="border-orange-500/30 bg-orange-500/5">
                            <CardContent className="p-3">
                                <p className="text-sm text-white mb-2">
                                    <strong>{selectedOrders.size}</strong> pedidos selecionados
                                </p>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                                        value={selectedDriver}
                                        onChange={e => setSelectedDriver(e.target.value)}
                                    >
                                        <option value="">Selecione o entregador</option>
                                        {deliveryPersons.map(dp => (
                                            <option key={dp.id} value={dp.id}>{dp.name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        disabled={!selectedDriver || creating}
                                        onClick={() => createBatch([...selectedOrders], selectedDriver)}
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        <Truck className="w-4 h-4 mr-1" />
                                        Criar Lote
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* === TAB: Lotes Ativos === */}
            {tab === 'active' && (
                <div className="space-y-3">
                    {batches.length === 0 ? (
                        <Card className="border-gray-700">
                            <CardContent className="p-6 text-center text-gray-400">
                                <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>Nenhum lote ativo no momento.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        batches.map(batch => (
                            <Card key={batch.batchId} className="border-gray-700">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-white text-base flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-blue-400" />
                                            Lote #{batch.batchId.slice(-6)}
                                        </CardTitle>
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                            {batch.orderCount} pedidos
                                        </span>
                                    </div>
                                    {batch.deliveryPerson && (
                                        <CardDescription className="text-gray-400 flex items-center gap-1">
                                            <UserCheck className="w-3 h-3" />
                                            {batch.deliveryPerson.name}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    {batch.orders.map(order => (
                                        <div key={order.id} className="flex items-center justify-between text-sm p-2 rounded bg-gray-800/50">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">
                                                    {order.batchOrder}
                                                </span>
                                                <div>
                                                    <p className="text-white">#{order.id.slice(-6)}</p>
                                                    <p className="text-xs text-gray-500 truncate">{order.destinationAddress?.split(',').slice(0, 2).join(',')}</p>
                                                </div>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' :
                                                    order.status === 'IN_TRANSIT' ? 'bg-purple-500/20 text-purple-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {order.status === 'DELIVERED' ? 'Entregue' :
                                                    order.status === 'IN_TRANSIT' ? 'Em trânsito' :
                                                        order.status === 'PICKED_UP' ? 'Coletado' : 'Aceito'}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-700/50 mt-1">
                                        <span>Total: R$ {batch.totalPrice.toFixed(2)}</span>
                                        <span>{batch.totalDistance.toFixed(1)} km</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
