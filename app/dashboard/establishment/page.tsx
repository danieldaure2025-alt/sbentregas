'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/shared/loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  MapPin,
  Phone,
  DollarSign,
  Clock,
  Plus,
  TrendingUp,
  Calendar,
  Loader2,
  Store,
  FileText,
} from 'lucide-react';

interface Order {
  id: string;
  destinationAddress: string;
  clientPhone?: string;
  notes?: string;
  status: string;
  price: number;
  distance: number;
  createdAt: string;
  deliveryPerson?: { name: string; phone?: string };
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  delivered: number;
  totalRevenue: number;
}

interface DailyReport {
  id: string;
  reportDate: string;
  totalOrders: number;
  totalRevenue: number;
  platformFees: number;
  netAmount: number;
  isPaid: boolean;
}

export default function EstablishmentDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newOrder, setNewOrder] = useState({
    destinationAddress: '',
    clientPhone: '',
    clientName: '',
    notes: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user || session.user.role !== 'ESTABLISHMENT') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      const [ordersRes, reportsRes] = await Promise.all([
        fetch('/api/establishment/orders'),
        fetch('/api/reports/daily?limit=7'),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
        setStats(data.stats || null);
      }

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.destinationAddress.trim()) {
      toast({ title: 'Erro', description: 'Endereço de destino é obrigatório', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/establishment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar pedido');
      }

      toast({ title: 'Sucesso!', description: 'Pedido criado com sucesso' });
      setNewOrder({ destinationAddress: '', clientPhone: '', clientName: '', notes: '' });
      setShowNewOrderForm(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (loading || status === 'loading') {
    return <Loading />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-7 h-7 text-orange-500" />
            Painel do Estabelecimento
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas entregas e acompanhe seus relatórios
          </p>
        </div>
        <Button onClick={() => setShowNewOrderForm(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrega
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-card border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Pedidos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Em Andamento</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Entregues</p>
                  <p className="text-2xl font-bold text-green-500">{stats.delivered}</p>
                </div>
                <Package className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Faturamento</p>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulário Nova Entrega */}
      {showNewOrderForm && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle>Nova Entrega</CardTitle>
            <CardDescription>
              Crie uma nova entrega. A origem será o endereço do seu estabelecimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destinationAddress">Endereço de Destino *</Label>
                <Input
                  id="destinationAddress"
                  value={newOrder.destinationAddress}
                  onChange={(e) => setNewOrder({ ...newOrder, destinationAddress: e.target.value })}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Telefone do Cliente</Label>
                <Input
                  id="clientPhone"
                  value={newOrder.clientPhone}
                  onChange={(e) => setNewOrder({ ...newOrder, clientPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  value={newOrder.clientName}
                  onChange={(e) => setNewOrder({ ...newOrder, clientName: e.target.value })}
                  placeholder="Nome do destinatário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  placeholder="Instruções especiais..."
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateOrder} disabled={creating} className="bg-orange-500 hover:bg-orange-600">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Criar Entrega
              </Button>
              <Button variant="outline" onClick={() => setShowNewOrderForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos Recentes */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-gray-700">
            <CardHeader>
              <CardTitle>Pedidos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum pedido ainda</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 10).map((order) => (
                    <div
                      key={order.id}
                      className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-orange-500/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            <span className="text-sm">{order.destinationAddress}</span>
                          </div>
                          {order.clientPhone && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <Phone className="w-3 h-3" />
                              <span className="text-xs">{order.clientPhone}</span>
                            </div>
                          )}
                          {order.deliveryPerson && (
                            <p className="text-xs text-gray-400">
                              Entregador: {order.deliveryPerson.name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <StatusBadge status={order.status as any} type="order" />
                          <p className="text-lg font-bold text-green-500 mt-1">
                            R$ {order.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Relatórios Diários */}
        <div>
          <Card className="bg-card border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Relatórios Diários
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nenhum relatório ainda</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(report.reportDate).toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${report.isPaid ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                          {report.isPaid ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-400">Pedidos</p>
                          <p className="font-bold">{report.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Faturamento</p>
                          <p className="font-bold text-green-500">R$ {report.totalRevenue.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Taxa Plataforma</p>
                          <p className="font-bold text-red-400">-R$ {report.platformFees.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Líquido</p>
                          <p className="font-bold text-blue-400">R$ {report.netAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
