'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  MapPin,
  User,
  Phone,
  Clock,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { OrderStatus } from '@prisma/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { exportToCSV, formatDateBR, translateStatus, translatePaymentMethod } from '@/lib/export-csv';

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  notes?: string;
  status: OrderStatus;
  price: number;
  distance: number;
  paymentMethod?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  client: { id: string; name: string; email: string; phone?: string };
  deliveryPerson?: { id: string; name: string; email: string; phone?: string; rating?: number };
  transactions: { paymentStatus: string; paymentMethod: string }[];
}

interface DeliveriesData {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: {
    total: number;
    awaitingPayment: number;
    pending: number;
    accepted: number;
    pickedUp: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
  };
}

export default function AdminDeliveriesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeliveriesData | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/deliveries?status=${statusFilter}&page=${page}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Erro ao carregar');
      }
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as entregas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, page]);

  const handleDeleteOrder = async (orderId: string) => {
    setDeletingOrder(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/delete`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast({ title: 'Sucesso', description: 'Pedido excluído com sucesso' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir pedido',
        variant: 'destructive',
      });
    } finally {
      setDeletingOrder(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'CREDIT_CARD': return 'Cartão';
      case 'PIX': return 'PIX';
      case 'CASH': return 'Dinheiro';
      case 'ON_DELIVERY': return 'Na Entrega';
      case 'INVOICED': return 'Faturada';
      case 'END_OF_DAY': return 'Final do Dia';
      default: return 'Não definido';
    }
  };

  if (loading && !data) return <Loading />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel de Entregas</h1>
          <p className="text-foreground/60">Gerencie todas as entregas da plataforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            if (!data?.orders?.length) return;
            exportToCSV(data.orders, [
              { header: 'ID', accessor: (o) => o.id.slice(-6) },
              { header: 'Status', accessor: (o) => translateStatus(o.status) },
              { header: 'Cliente', accessor: (o) => o.client?.name || o.client?.email || '' },
              { header: 'Entregador', accessor: (o) => o.deliveryPerson?.name || 'Sem entregador' },
              { header: 'Origem', accessor: (o) => o.originAddress },
              { header: 'Destino', accessor: (o) => o.destinationAddress },
              { header: 'Valor (R$)', accessor: (o) => o.price },
              { header: 'Distância (km)', accessor: (o) => o.distance },
              { header: 'Pagamento', accessor: (o) => translatePaymentMethod(o.paymentMethod) },
              { header: 'Data', accessor: (o) => formatDateBR(o.createdAt) },
            ], `entregas_${new Date().toISOString().slice(0, 10)}`);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card className={`bg-card cursor-pointer hover:border-orange-500/50 transition-colors ${statusFilter === 'all' ? 'border-orange-500' : ''}`}
            onClick={() => { setStatusFilter('all'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Total</p>
              <p className="text-xl font-bold text-foreground">{data.stats.total}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-yellow-500/50 transition-colors ${statusFilter === 'AWAITING_PAYMENT' ? 'border-yellow-500' : ''}`}
            onClick={() => { setStatusFilter('AWAITING_PAYMENT'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Aguard. Pag.</p>
              <p className="text-xl font-bold text-yellow-500">{data.stats.awaitingPayment}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-blue-500/50 transition-colors ${statusFilter === 'PENDING' ? 'border-blue-500' : ''}`}
            onClick={() => { setStatusFilter('PENDING'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Pendentes</p>
              <p className="text-xl font-bold text-blue-500">{data.stats.pending}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-cyan-500/50 transition-colors ${statusFilter === 'ACCEPTED' ? 'border-cyan-500' : ''}`}
            onClick={() => { setStatusFilter('ACCEPTED'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Aceitos</p>
              <p className="text-xl font-bold text-cyan-500">{data.stats.accepted}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-purple-500/50 transition-colors ${statusFilter === 'PICKED_UP' ? 'border-purple-500' : ''}`}
            onClick={() => { setStatusFilter('PICKED_UP'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Coletados</p>
              <p className="text-xl font-bold text-purple-500">{data.stats.pickedUp}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-indigo-500/50 transition-colors ${statusFilter === 'IN_TRANSIT' ? 'border-indigo-500' : ''}`}
            onClick={() => { setStatusFilter('IN_TRANSIT'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Em Trânsito</p>
              <p className="text-xl font-bold text-indigo-500">{data.stats.inTransit}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-green-500/50 transition-colors ${statusFilter === 'DELIVERED' ? 'border-green-500' : ''}`}
            onClick={() => { setStatusFilter('DELIVERED'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Entregues</p>
              <p className="text-xl font-bold text-green-500">{data.stats.delivered}</p>
            </CardContent>
          </Card>
          <Card className={`bg-card cursor-pointer hover:border-red-500/50 transition-colors ${statusFilter === 'CANCELLED' ? 'border-red-500' : ''}`}
            onClick={() => { setStatusFilter('CANCELLED'); setPage(1); }}>
            <CardContent className="pt-4 pb-3 px-3">
              <p className="text-xs text-foreground/60">Cancelados</p>
              <p className="text-xl font-bold text-red-500">{data.stats.cancelled}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Entregas</CardTitle>
          <CardDescription>
            {data ? `Mostrando ${data.orders.length} de ${data.pagination.total} entregas` : 'Carregando...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : !data || data.orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhuma entrega encontrada"
              description="Não há entregas com o filtro selecionado"
            />
          ) : (
            <div className="space-y-4">
              {data.orders.map((order) => (
                <div key={order.id} className="border border-border rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono text-foreground/60">#{order.id.slice(-6)}</span>
                        <StatusBadge status={order.status} type="order" />
                        <span className="text-sm text-foreground/60">{getPaymentMethodLabel(order.paymentMethod)}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-foreground/60">Coleta</p>
                              <p className="text-sm text-foreground">{order.originAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-foreground/60">Entrega</p>
                              <p className="text-sm text-foreground">{order.destinationAddress}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-foreground/60">Cliente</p>
                              <p className="text-sm text-foreground">{order.client.name || order.client.email}</p>
                              {order.client.phone && (
                                <p className="text-xs text-foreground/60">{order.client.phone}</p>
                              )}
                            </div>
                          </div>
                          {order.deliveryPerson ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-orange-500" />
                              <div>
                                <p className="text-xs text-foreground/60">Entregador</p>
                                <p className="text-sm text-foreground">{order.deliveryPerson.name || order.deliveryPerson.email}</p>
                                {order.deliveryPerson.phone && (
                                  <p className="text-xs text-foreground/60">{order.deliveryPerson.phone}</p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground/40 italic">Aguardando entregador</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xl font-bold text-orange-500">{formatCurrency(order.price)}</p>
                      <p className="text-sm text-foreground/60">{order.distance.toFixed(1)} km</p>
                      <div className="flex items-center gap-1 text-xs text-foreground/40">
                        <Clock className="h-3 w-3" />
                        {formatDate(order.createdAt)}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={deletingOrder === order.id}>
                              {deletingOrder === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Excluir Pedido
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-foreground/60">
                                Tem certeza que deseja excluir o pedido #{order.id.slice(-6)}?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-background text-foreground">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrder(order.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-foreground/60">
                    Página {page} de {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page === data.pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
