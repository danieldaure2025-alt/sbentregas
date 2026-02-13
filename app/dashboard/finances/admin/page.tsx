'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loading } from '@/components/shared/loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  QrCode,
  Building2,
  Loader2,
  MapPin,
  Package,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  pixKeyType?: string;
  pixKey?: string;
  bankCode?: string;
  bankName?: string;
  agencyNumber?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolder?: string;
  cpfCnpj?: string;
  adminNotes?: string;
  processedAt?: string;
  createdAt: string;
  user: { id: string; name: string; email: string; phone?: string };
}

interface NeighborhoodStat {
  name: string;
  totalOrders: number;
  delivered: number;
  cancelled: number;
  pending: number;
  inProgress: number;
  totalRevenue: number;
  deliveredPercent: number;
  cancelledPercent: number;
  deliveryPersons: string[];
}

interface FinanceData {
  totalRevenue: number;
  totalPlatformFees: number;
  totalDeliveryFees: number;
  totalWithdrawn: number;
  transactionsCount: number;
  orderStats: { status: string; _count: number }[];
  paymentMethods: { paymentMethod: string; _count: number; _sum: { price: number } }[];
  pendingWithdrawals: Withdrawal[];
  allWithdrawals: Withdrawal[];
  topDeliveryPersons: { deliveryPersonId: string; _count: number; user: { name: string; email: string; rating: number } }[];
  recentTransactions: {
    id: string;
    totalAmount: number;
    platformFee: number;
    deliveryFee: number;
    paymentMethod: string;
    createdAt: string;
    order: {
      id: string;
      originAddress: string;
      destinationAddress: string;
      client: { name: string; email: string };
      deliveryPerson: { name: string; email: string } | null;
    };
  }[];
}

interface NeighborhoodData {
  neighborhoods: NeighborhoodStat[];
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    inProgressOrders: number;
    deliveredPercent: number;
    cancelledPercent: number;
  };
}

export default function AdminFinancesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [neighborhoodData, setNeighborhoodData] = useState<NeighborhoodData | null>(null);
  const [period, setPeriod] = useState('month');
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [financeRes, neighborhoodRes] = await Promise.all([
        fetch(`/api/finances/admin?period=${period}`),
        fetch(`/api/dashboard/stats/neighborhoods?period=${period}`),
      ]);

      if (!financeRes.ok) {
        if (financeRes.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Erro ao carregar dados');
      }

      const finance = await financeRes.json();
      const neighborhood = await neighborhoodRes.json();

      setFinanceData(finance);
      setNeighborhoodData(neighborhood);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados financeiros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleWithdrawalAction = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    setProcessingWithdrawal(id);
    try {
      const res = await fetch(`/api/finances/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar');
      }

      toast({ title: 'Sucesso', description: data.message });
      fetchData();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar saque',
        variant: 'destructive',
      });
    } finally {
      setProcessingWithdrawal(null);
    }
  };

  if (loading) return <Loading />;
  if (!financeData || !neighborhoodData) return null;

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500 bg-yellow-500/10';
      case 'APPROVED': return 'text-blue-500 bg-blue-500/10';
      case 'COMPLETED': return 'text-green-500 bg-green-500/10';
      case 'REJECTED': return 'text-red-500 bg-red-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'APPROVED': return 'Aprovado';
      case 'COMPLETED': return 'Concluído';
      case 'REJECTED': return 'Rejeitado';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central Financeira</h1>
          <p className="text-foreground/60">Gestão financeira completa da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-foreground"
          >
            <option value="day">Hoje</option>
            <option value="week">7 dias</option>
            <option value="month">30 dias</option>
            <option value="all">Todo período</option>
          </select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Receita Total</p>
                <p className="text-2xl font-bold text-orange-500">{formatCurrency(financeData.totalRevenue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Taxa Plataforma</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(financeData.totalPlatformFees)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Pago Entregadores</p>
                <p className="text-2xl font-bold text-blue-500">{formatCurrency(financeData.totalDeliveryFees)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/60">Saques Realizados</p>
                <p className="text-2xl font-bold text-purple-500">{formatCurrency(financeData.totalWithdrawn)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="withdrawals" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <Banknote className="h-4 w-4 mr-2" />
            Saques Pendentes ({financeData.pendingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="neighborhoods" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <MapPin className="h-4 w-4 mr-2" />
            Estatísticas por Bairro
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <CreditCard className="h-4 w-4 mr-2" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Histórico de Saques
          </TabsTrigger>
        </TabsList>

        {/* Pending Withdrawals Tab */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Solicitações de Saque Pendentes</CardTitle>
              <CardDescription>Gerencie as solicitações de saque dos entregadores</CardDescription>
            </CardHeader>
            <CardContent>
              {financeData.pendingWithdrawals.length === 0 ? (
                <div className="text-center py-8 text-foreground/60">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhuma solicitação de saque pendente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {financeData.pendingWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{withdrawal.user.name || withdrawal.user.email}</p>
                          <p className="text-sm text-foreground/60">{withdrawal.user.email}</p>
                          {withdrawal.user.phone && (
                            <p className="text-sm text-foreground/60">{withdrawal.user.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-500">{formatCurrency(withdrawal.amount)}</p>
                          <p className="text-sm text-foreground/60">{formatDate(withdrawal.createdAt)}</p>
                        </div>
                      </div>

                      <div className="bg-background/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {withdrawal.method === 'PIX' ? (
                            <QrCode className="h-5 w-5 text-green-500" />
                          ) : (
                            <Building2 className="h-5 w-5 text-blue-500" />
                          )}
                          <span className="font-semibold text-foreground">{withdrawal.method}</span>
                        </div>
                        {withdrawal.method === 'PIX' ? (
                          <div className="space-y-1 text-sm">
                            <p><span className="text-foreground/60">Tipo:</span> <span className="text-foreground">{withdrawal.pixKeyType}</span></p>
                            <p><span className="text-foreground/60">Chave:</span> <span className="text-foreground font-mono">{withdrawal.pixKey}</span></p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><span className="text-foreground/60">Banco:</span> <span className="text-foreground">{withdrawal.bankCode} - {withdrawal.bankName}</span></p>
                            <p><span className="text-foreground/60">Agência:</span> <span className="text-foreground">{withdrawal.agencyNumber}</span></p>
                            <p><span className="text-foreground/60">Conta:</span> <span className="text-foreground">{withdrawal.accountNumber}</span></p>
                            <p><span className="text-foreground/60">Tipo:</span> <span className="text-foreground">{withdrawal.accountType}</span></p>
                            <p><span className="text-foreground/60">Titular:</span> <span className="text-foreground">{withdrawal.accountHolder}</span></p>
                            <p><span className="text-foreground/60">CPF/CNPJ:</span> <span className="text-foreground">{withdrawal.cpfCnpj}</span></p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'approve')}
                          disabled={processingWithdrawal === withdrawal.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingWithdrawal === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'complete')}
                          disabled={processingWithdrawal === withdrawal.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {processingWithdrawal === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 mr-2" />
                          )}
                          Marcar como Pago
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'reject')}
                          disabled={processingWithdrawal === withdrawal.id}
                        >
                          {processingWithdrawal === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Neighborhoods Tab */}
        <TabsContent value="neighborhoods" className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground/60">Total de Pedidos</p>
                <p className="text-2xl font-bold text-foreground">{neighborhoodData.summary.totalOrders}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-green-500/30">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground/60">Entregues</p>
                <p className="text-2xl font-bold text-green-500">{neighborhoodData.summary.deliveredOrders} ({neighborhoodData.summary.deliveredPercent}%)</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-red-500/30">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground/60">Cancelados</p>
                <p className="text-2xl font-bold text-red-500">{neighborhoodData.summary.cancelledOrders} ({neighborhoodData.summary.cancelledPercent}%)</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-blue-500/30">
              <CardContent className="pt-4">
                <p className="text-sm text-foreground/60">Em Andamento</p>
                <p className="text-2xl font-bold text-blue-500">{neighborhoodData.summary.inProgressOrders}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Estatísticas por Bairro</CardTitle>
              <CardDescription>Visão detalhada das coletas por região</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-foreground/60 font-medium">Bairro/Região</th>
                      <th className="text-center py-3 px-2 text-foreground/60 font-medium">Total</th>
                      <th className="text-center py-3 px-2 text-foreground/60 font-medium">Entregues</th>
                      <th className="text-center py-3 px-2 text-foreground/60 font-medium">Cancelados</th>
                      <th className="text-center py-3 px-2 text-foreground/60 font-medium">Em Andamento</th>
                      <th className="text-right py-3 px-2 text-foreground/60 font-medium">Receita</th>
                      <th className="text-left py-3 px-2 text-foreground/60 font-medium">Entregadores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neighborhoodData.neighborhoods.map((n, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-background/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-foreground">{n.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-foreground">{n.totalOrders}</td>
                        <td className="text-center py-3 px-2">
                          <span className="text-green-500">{n.delivered} ({n.deliveredPercent}%)</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-red-500">{n.cancelled} ({n.cancelledPercent}%)</span>
                        </td>
                        <td className="text-center py-3 px-2 text-blue-500">{n.inProgress + n.pending}</td>
                        <td className="text-right py-3 px-2 text-orange-500 font-medium">{formatCurrency(n.totalRevenue)}</td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {n.deliveryPersons.slice(0, 2).map((dp, i) => (
                              <span key={i} className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                                {dp.split(' ')[0]}
                              </span>
                            ))}
                            {n.deliveryPersons.length > 2 && (
                              <span className="text-xs text-foreground/60">+{n.deliveryPersons.length - 2}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Transações Recentes</CardTitle>
              <CardDescription>Últimas {financeData.recentTransactions.length} transações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financeData.recentTransactions.map((tx) => (
                  <div key={tx.id} className="border border-border rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {tx.order.client.name || tx.order.client.email}
                        </p>
                        <p className="text-sm text-foreground/60 truncate">
                          {tx.order.originAddress} → {tx.order.destinationAddress}
                        </p>
                        <p className="text-xs text-foreground/40 mt-1">
                          Entregador: {tx.order.deliveryPerson?.name || 'Não atribuído'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-lg font-bold text-foreground">{formatCurrency(tx.totalAmount)}</p>
                        <div className="flex items-center gap-2 justify-end text-xs">
                          <span className="text-green-500">+{formatCurrency(tx.platformFee)} plat.</span>
                          <span className="text-blue-500">{formatCurrency(tx.deliveryFee)} entreg.</span>
                        </div>
                        <p className="text-xs text-foreground/40">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Breakdown */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Métodos de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {financeData.paymentMethods.map((pm) => (
                  <div key={pm.paymentMethod} className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {pm.paymentMethod === 'CREDIT_CARD' && <CreditCard className="h-5 w-5 text-purple-500" />}
                      {pm.paymentMethod === 'PIX' && <QrCode className="h-5 w-5 text-green-500" />}
                      {pm.paymentMethod === 'CASH' && <Banknote className="h-5 w-5 text-yellow-500" />}
                      <span className="font-medium text-foreground">
                        {pm.paymentMethod === 'CREDIT_CARD' ? 'Cartão' : pm.paymentMethod === 'PIX' ? 'PIX' : 'Dinheiro'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{pm._count} pedidos</p>
                    <p className="text-sm text-foreground/60">{formatCurrency(pm._sum.price || 0)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Histórico de Saques</CardTitle>
              <CardDescription>Todos os saques processados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financeData.allWithdrawals.map((w) => (
                  <div key={w.id} className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {w.method === 'PIX' ? (
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <QrCode className="h-5 w-5 text-green-500" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{w.user.name || w.user.email}</p>
                        <p className="text-sm text-foreground/60">{w.method}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(w.amount)}</p>
                        <p className="text-xs text-foreground/40">{formatDate(w.createdAt)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(w.status)}`}>
                        {getStatusLabel(w.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
