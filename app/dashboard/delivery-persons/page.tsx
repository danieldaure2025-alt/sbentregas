'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/hooks/use-toast';
import { Users, MapPin, Phone, Star, Package, RefreshCw, Circle, Loader2, Navigation, Bike, Car, Truck } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const DeliveryPersonsMap = dynamic(() => import('@/components/maps/delivery-persons-map'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-gray-800 rounded-lg flex items-center justify-center"><Loader2 className="animate-spin" /></div>,
});

interface DeliveryPerson {
  id: string;
  name: string;
  email: string;
  phone?: string;
  vehicleType?: string;
  rating?: number;
  totalDeliveries?: number;
  isOnline: boolean;
  lastOnlineAt?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: string;
  ordersAsDeliveryPerson: Array<{
    id: string;
    status: string;
    originAddress: string;
    destinationAddress: string;
  }>;
}

interface Stats {
  total: number;
  online: number;
  offline: number;
  busy: number;
  available: number;
}

export default function DeliveryPersonsPage() {
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, online: 0, offline: 0, busy: 0, available: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const { toast } = useToast();

  const fetchDeliveryPersons = useCallback(async () => {
    try {
      const res = await fetch('/api/users/delivery-persons');
      if (res.ok) {
        const data = await res.json();
        setDeliveryPersons(data.deliveryPersons);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching delivery persons:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os entregadores.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDeliveryPersons();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDeliveryPersons, 30000);
    return () => clearInterval(interval);
  }, [fetchDeliveryPersons]);

  const getVehicleIcon = (vehicleType?: string) => {
    switch (vehicleType?.toLowerCase()) {
      case 'moto':
      case 'motocicleta':
        return <Bike className="h-4 w-4" />;
      case 'carro':
        return <Car className="h-4 w-4" />;
      case 'caminhão':
      case 'van':
        return <Truck className="h-4 w-4" />;
      default:
        return <Bike className="h-4 w-4" />;
    }
  };

  const filteredPersons = deliveryPersons.filter(person => {
    if (filter === 'online') return person.isOnline;
    if (filter === 'offline') return !person.isOnline;
    return true;
  });

  const onlineWithLocation = deliveryPersons.filter(
    p => p.isOnline && p.currentLatitude && p.currentLongitude
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Entregadores</h1>
          <p className="text-muted-foreground">
            Monitore a localização e status dos entregadores em tempo real
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchDeliveryPersons()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-900/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.online}</p>
            <p className="text-sm text-muted-foreground">Online</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-900/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.offline}</p>
            <p className="text-sm text-muted-foreground">Offline</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-900/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500">{stats.busy}</p>
            <p className="text-sm text-muted-foreground">Em entrega</p>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/30 bg-cyan-900/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-cyan-500">{stats.available}</p>
            <p className="text-sm text-muted-foreground">Disponíveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      {onlineWithLocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-500" />
              Mapa em Tempo Real
            </CardTitle>
            <CardDescription>
              Localização dos {onlineWithLocation.length} entregadores online
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeliveryPersonsMap deliveryPersons={onlineWithLocation} />
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos ({stats.total})
        </Button>
        <Button
          variant={filter === 'online' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('online')}
          className={filter === 'online' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <Circle className="h-3 w-3 mr-2 fill-green-500" />
          Online ({stats.online})
        </Button>
        <Button
          variant={filter === 'offline' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('offline')}
          className={filter === 'offline' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <Circle className="h-3 w-3 mr-2 fill-red-500" />
          Offline ({stats.offline})
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Entregadores</CardTitle>
          <CardDescription>Total: {filteredPersons.length} entregadores</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPersons.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum entregador encontrado"
              description="Não há entregadores com o filtro selecionado."
            />
          ) : (
            <div className="space-y-4">
              {filteredPersons.map((person) => (
                <Card
                  key={person.id}
                  className={person.isOnline ? 'border-green-500/30 bg-green-900/10' : 'border-gray-600/30'}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-3 h-3 rounded-full mt-2 ${person.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{person.name || 'Sem nome'}</p>
                            {person.vehicleType && (
                              <span className="flex items-center gap-1 text-xs bg-gray-700 px-2 py-1 rounded">
                                {getVehicleIcon(person.vehicleType)}
                                {person.vehicleType}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{person.email}</p>
                          {person.phone && (
                            <p className="text-sm flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {person.phone}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {person.rating !== null && person.rating !== undefined && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                {person.rating.toFixed(1)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {person.totalDeliveries || 0} entregas
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className={`font-semibold ${person.isOnline ? 'text-green-400' : 'text-red-400'}`}>
                          {person.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </p>
                        {person.lastOnlineAt && (
                          <p className="text-xs text-muted-foreground">
                            Última vez: {new Date(person.lastOnlineAt).toLocaleString('pt-BR')}
                          </p>
                        )}
                        {person.isOnline && person.currentLatitude && person.currentLongitude && (
                          <p className="text-xs text-green-400 flex items-center justify-end gap-1">
                            <Navigation className="h-3 w-3" />
                            Localização ativa
                          </p>
                        )}
                        {person.ordersAsDeliveryPerson.length > 0 && (
                          <p className="text-xs text-yellow-400">
                            {person.ordersAsDeliveryPerson.length} pedido(s) em andamento
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Active Orders */}
                    {person.ordersAsDeliveryPerson.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm font-medium mb-2">Pedidos em andamento:</p>
                        {person.ordersAsDeliveryPerson.map((order) => (
                          <div key={order.id} className="text-sm bg-gray-800/50 p-2 rounded mb-2">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-blue-400" />
                              <span className="text-muted-foreground truncate">{order.originAddress}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Navigation className="h-3 w-3 text-orange-400" />
                              <span className="text-muted-foreground truncate">{order.destinationAddress}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
