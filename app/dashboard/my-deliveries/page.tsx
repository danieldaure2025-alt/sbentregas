'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Package, Filter } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  price: number;
  distance: number;
  createdAt: string;
  client: { name: string; phone?: string };
  transactions: Array<{
    deliveryFee: number;
  }>;
}

export default function MyDeliveriesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const url =
          statusFilter === 'ALL' ? '/api/orders' : `/api/orders?status=${statusFilter}`;
        const res = await fetch(url);

        if (res.ok) {
          const data = await res.json();
          setOrders(data?.orders ?? []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Minhas Entregas</h1>
        <p className="text-muted-foreground">Gerencie suas entregas e atualize status</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Entregas</CardTitle>
              <CardDescription>Total: {orders?.length ?? 0} entregas</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Todos</option>
                <option value="ACCEPTED">Aceitos</option>
                <option value="PICKED_UP">Coletados</option>
                <option value="IN_TRANSIT">Em Trânsito</option>
                <option value="DELIVERED">Entregues</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma entrega encontrada"
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
              {orders?.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/my-deliveries/${order.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <StatusBadge status={order.status as any} type="order" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-medium">{order?.client?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.originAddress} → {order.destinationAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Distância: {order.distance} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Você ganha</p>
                      <p className="font-bold text-xl text-green-600">
                        R$ {order?.transactions?.[0]?.deliveryFee?.toFixed(2) ?? '0.00'}
                      </p>
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
