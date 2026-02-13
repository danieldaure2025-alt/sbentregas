'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/shared/loading';
import { Package, DollarSign, CheckCircle, Clock, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';

interface Stats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
}

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  price: number;
  createdAt: string;
  deliveryPerson?: { name: string; phone: string };
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/orders?limit=5'),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setRecentOrders(ordersData?.orders ?? []);
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
          <h1 className="text-3xl font-bold mb-2">Meu Painel</h1>
          <p className="text-muted-foreground">Gerencie seus pedidos de coleta e entrega</p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link href="/dashboard/new-order">
            <PlusCircle className="w-5 h-5" />
            Novo Pedido
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.totalSpent?.toFixed(2) ?? '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Ativos</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrders ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedOrders ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meus Pedidos Recentes</CardTitle>
              <CardDescription>Acompanhe o status das suas entregas</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/orders">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum pedido ainda"
              description="Crie seu primeiro pedido para começar a usar a plataforma"
              action={
                <Button asChild>
                  <Link href="/dashboard/new-order">
                    <PlusCircle className="w-4 h-4" />
                    Criar Pedido
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {recentOrders?.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <StatusBadge status={order.status as any} type="order" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.originAddress} → {order.destinationAddress}
                      </p>
                      {order?.deliveryPerson && (
                        <p className="text-sm font-medium mt-1">
                          Entregador: {order.deliveryPerson.name}
                        </p>
                      )}
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
