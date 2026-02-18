'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/shared/loading';
import { TruckIcon, DollarSign, Star, Package, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';

interface Stats {
  totalDeliveries: number;
  activeOrders: number;
  completedOrders: number;
  totalEarnings: number;
  averageRating: number;
  pendingOrders: number;
}

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  price: number;
  createdAt: string;
  client: { name: string; phone: string };
}

export default function DeliveryPersonDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/orders?status=ACCEPTED&status=PICKED_UP&status=IN_TRANSIT&limit=5'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setActiveOrders(ordersData?.orders ?? []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meu Painel de Entregas</h1>
          <p className="text-muted-foreground">Gerencie suas entregas e ganhos</p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link href="/dashboard/available">
            <Package className="w-5 h-5" />
            Ver Disponíveis ({stats?.pendingOrders ?? 0})
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.totalEarnings?.toFixed(2) ?? '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entregas</CardTitle>
            <TruckIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDeliveries ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrders ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedOrders ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageRating?.toFixed(1) ?? '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">de 5.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entregas em Andamento</CardTitle>
              <CardDescription>Atualize o status das suas entregas</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/my-deliveries">Ver todas</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeOrders?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma entrega ativa"
              description="Aceite pedidos disponíveis para começar a entregar"
              action={
                <Button asChild>
                  <Link href="/dashboard/available">
                    <Package className="w-4 h-4" />
                    Ver Pedidos Disponíveis
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {activeOrders?.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/my-deliveries/${order.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <StatusBadge status={order.status as any} type="order" />
                      </div>
                      <p className="font-medium">{order?.client?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.originAddress} → {order.destinationAddress}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Cliente: {order?.client?.phone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">R$ {order?.price?.toFixed(2) ?? '0.00'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
