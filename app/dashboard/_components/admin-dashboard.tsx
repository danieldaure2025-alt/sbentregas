'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/shared/loading';
import { DollarSign, Package, TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ORDER_STATUS_LABELS } from '@/lib/constants';

interface Stats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalRevenue: number;
  platformRevenue: number;
  totalUsers: number;
  activeDeliveryPersons: number;
}

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  price: number;
  createdAt: string;
  client: { name: string };
  deliveryPerson?: { name: string };
}

export default function AdminDashboard() {
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie entregas, usuários e configurações da plataforma</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.totalRevenue?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Plataforma: R$ {stats?.platformRevenue?.toFixed(2) ?? '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Ativos: {stats?.activeOrders ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Completos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalOrders ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Entregadores: {stats?.activeDeliveryPersons ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Visualize e gerencie os últimos pedidos</CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/orders">Ver todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentOrders?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum pedido encontrado</p>
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
                      <p className="font-medium">{order?.client?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.originAddress} → {order.destinationAddress}
                      </p>
                      {order?.deliveryPerson && (
                        <p className="text-sm text-muted-foreground">
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

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/users">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Gerenciar Usuários</span>
              </CardTitle>
              <CardDescription>Aprovar, editar ou bloquear usuários</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/orders">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Todos os Pedidos</span>
              </CardTitle>
              <CardDescription>Visualize e intervenha em pedidos</CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/settings">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Configurações</span>
              </CardTitle>
              <CardDescription>Ajuste taxas e comissões</CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
