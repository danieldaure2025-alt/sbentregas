'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Package, PlusCircle, Filter, Download } from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { exportToCSV, formatDateBR, translateStatus } from '@/lib/export-csv';

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  price: number;
  distance: number;
  createdAt: string;
  client?: { name: string; email: string };
  deliveryPerson?: { name: string; phone: string };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const url = statusFilter === 'ALL' ? '/api/orders' : `/api/orders?status=${statusFilter}`;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pedidos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os pedidos da plataforma
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          if (!orders?.length) return;
          exportToCSV(orders, [
            { header: 'Status', accessor: (o) => translateStatus(o.status) },
            { header: 'Origem', accessor: (o) => o.originAddress },
            { header: 'Destino', accessor: (o) => o.destinationAddress },
            { header: 'Valor (R$)', accessor: (o) => o.price },
            { header: 'Distância (km)', accessor: (o) => o.distance },
            { header: 'Entregador', accessor: (o) => o.deliveryPerson?.name || '-' },
            { header: 'Data', accessor: (o) => formatDateBR(o.createdAt) },
          ], `pedidos_${new Date().toISOString().slice(0, 10)}`);
        }}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Pedidos</CardTitle>
              <CardDescription>Total: {orders?.length ?? 0} pedidos</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="ACCEPTED">Aceitos</option>
                <option value="PICKED_UP">Coletados</option>
                <option value="IN_TRANSIT">Em Trânsito</option>
                <option value="DELIVERED">Entregues</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum pedido encontrado"
              description="Nenhum pedido foi encontrado com os filtros selecionados"
            />
          ) : (
            <div className="space-y-4">
              {orders?.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <StatusBadge status={order.status as any} type="order" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <strong>Origem:</strong> {order.originAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Destino:</strong> {order.destinationAddress}
                      </p>
                      {order?.client && (
                        <p className="text-sm font-medium">Cliente: {order.client.name}</p>
                      )}
                      {order?.deliveryPerson && (
                        <p className="text-sm font-medium">
                          Entregador: {order.deliveryPerson.name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Distância: {order?.distance} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-xl">R$ {order?.price?.toFixed(2) ?? '0.00'}</p>
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
