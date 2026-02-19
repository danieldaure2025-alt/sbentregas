'use client';

import { Loading } from '@/components/shared/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Loader2,
  QrCode,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { exportToCSV, formatDateBR } from '@/lib/export-csv';

interface Delivery {
  id: string;
  originAddress: string;
  destinationAddress: string;
  completedAt: string;
  deliveryFee: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  processedAt?: string;
}

interface BankData {
  pixKeyType?: string;
  pixKey?: string;
  bankCode?: string;
  bankName?: string;
  agencyNumber?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolder?: string;
  cpfCnpj?: string;
}

interface FinancesData {
  totalEarnings: number;
  availableBalance: number;
  withdrawnAmount: number;
  pendingWithdrawal: number;
  deliveriesCount: number;
  deliveries: Delivery[];
  withdrawals: Withdrawal[];
  bankData: BankData;
}

const BANKS = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '033', name: 'Santander' },
  { code: '104', name: 'Caixa Econômica' },
  { code: '237', name: 'Bradesco' },
  { code: '341', name: 'Itaú' },
  { code: '260', name: 'Nubank' },
  { code: '077', name: 'Inter' },
  { code: '212', name: 'Original' },
  { code: '336', name: 'C6 Bank' },
  { code: '290', name: 'PagBank' },
];

export default function FinancesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancesData | null>(null);
  const [period, setPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw' | 'bank'>('overview');

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'PIX' | 'TED'>('PIX');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Bank data form
  const [bankData, setBankData] = useState<BankData>({});
  const [isSavingBank, setIsSavingBank] = useState(false);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
      const res = await fetch(`/api/finances?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setBankData(result.bankData || {});
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, customStartDate, customEndDate]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor válido', variant: 'destructive' });
      return;
    }

    if (amount > (data?.availableBalance || 0)) {
      toast({ title: 'Erro', description: 'Saldo insuficiente', variant: 'destructive' });
      return;
    }

    setIsWithdrawing(true);
    try {
      const res = await fetch('/api/finances/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method: withdrawMethod }),
      });

      const result = await res.json();

      if (res.ok) {
        toast({ title: 'Sucesso!', description: result.message });
        setWithdrawAmount('');
        fetchData();
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao solicitar saque', variant: 'destructive' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSaveBankData = async () => {
    setIsSavingBank(true);
    try {
      const res = await fetch('/api/finances/bank-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankData),
      });

      const result = await res.json();

      if (res.ok) {
        toast({ title: 'Sucesso!', description: result.message });
        fetchData();
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao salvar dados', variant: 'destructive' });
    } finally {
      setIsSavingBank(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs"><Clock className="w-3 h-3" /> Pendente</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs"><CheckCircle className="w-3 h-3" /> Aprovado</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Concluído</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Rejeitado</span>;
      default:
        return null;
    }
  };

  if (loading) return <Loading />;

  const inputClass = "bg-[hsl(220,15%,13%)] border-[hsl(220,15%,20%)] text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20";
  const selectClass = "w-full h-10 rounded-md border px-3 py-2 text-sm bg-[hsl(220,15%,13%)] border-[hsl(220,15%,20%)] text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none";

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-8 h-8 text-orange-500" />
            Central Financeira
          </h1>
          <p className="text-gray-400">Gerencie seus ganhos e saques</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={selectClass + " w-auto"}
          >
            <option value="day">Hoje</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mês</option>
            <option value="all">Todo Período</option>
            <option value="custom">Personalizado</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => {
            if (!data?.deliveries?.length) return;
            exportToCSV(data.deliveries, [
              { header: 'Origem', accessor: (d) => d.originAddress },
              { header: 'Destino', accessor: (d) => d.destinationAddress },
              { header: 'Valor (R$)', accessor: (d) => d.deliveryFee },
              { header: 'Data', accessor: (d) => formatDateBR(d.completedAt) },
            ], `financeiro_${new Date().toISOString().slice(0, 10)}`);
          }}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className={selectClass + " w-auto text-sm"}
            />
            <span className="text-gray-400">até</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className={selectClass + " w-auto text-sm"}
            />
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs">Saldo Disponível</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              R$ {data?.availableBalance?.toFixed(2) || '0,00'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Ganho</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              R$ {data?.totalEarnings?.toFixed(2) || '0,00'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-400 mb-1">
              <ArrowUpCircle className="w-4 h-4" />
              <span className="text-xs">Já Sacado</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              R$ {data?.withdrawnAmount?.toFixed(2) || '0,00'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Saque Pendente</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white">
              R$ {data?.pendingWithdrawal?.toFixed(2) || '0,00'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[hsl(220,15%,20%)] pb-2">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
          className={activeTab === 'overview' ? 'bg-orange-500 hover:bg-orange-600' : 'text-gray-400'}
        >
          <Calendar className="w-4 h-4 mr-2" /> Histórico
        </Button>
        <Button
          variant={activeTab === 'withdraw' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('withdraw')}
          className={activeTab === 'withdraw' ? 'bg-orange-500 hover:bg-orange-600' : 'text-gray-400'}
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" /> Sacar
        </Button>
        <Button
          variant={activeTab === 'bank' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('bank')}
          className={activeTab === 'bank' ? 'bg-orange-500 hover:bg-orange-600' : 'text-gray-400'}
        >
          <Building2 className="w-4 h-4 mr-2" /> Dados Bancários
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Entregas Recentes */}
          <Card className="bg-card border-[hsl(220,15%,20%)]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-400" />
                Entregas Recentes ({data?.deliveriesCount || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {data?.deliveries?.length ? (
                data.deliveries.map((d) => (
                  <div key={d.id} className="p-3 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,20%)]">
                    <div className="flex justify-between items-start">
                      <div className="text-sm">
                        <p className="text-gray-400 truncate max-w-[200px]">{d.originAddress}</p>
                        <p className="text-gray-300 truncate max-w-[200px]">→ {d.destinationAddress}</p>
                      </div>
                      <span className="text-green-400 font-bold">+R$ {d.deliveryFee.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(d.completedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhuma entrega no período</p>
              )}
            </CardContent>
          </Card>

          {/* Saques */}
          <Card className="bg-card border-[hsl(220,15%,20%)]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-orange-400" />
                Histórico de Saques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {data?.withdrawals?.length ? (
                data.withdrawals.map((w) => (
                  <div key={w.id} className="p-3 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,20%)]">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">R$ {w.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">via {w.method}</p>
                      </div>
                      {getStatusBadge(w.status)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(w.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum saque realizado</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'withdraw' && (
        <Card className="bg-card border-[hsl(220,15%,20%)] max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Solicitar Saque</CardTitle>
            <CardDescription>Saldo disponível: R$ {data?.availableBalance?.toFixed(2) || '0,00'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Método de Saque</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={withdrawMethod === 'PIX' ? 'default' : 'outline'}
                  onClick={() => setWithdrawMethod('PIX')}
                  className={withdrawMethod === 'PIX' ? 'bg-blue-600 hover:bg-blue-700 flex-1' : 'flex-1 border-[hsl(220,15%,20%)] text-gray-300'}
                >
                  <QrCode className="w-4 h-4 mr-2" /> PIX
                </Button>
                <Button
                  type="button"
                  variant={withdrawMethod === 'TED' ? 'default' : 'outline'}
                  onClick={() => setWithdrawMethod('TED')}
                  className={withdrawMethod === 'TED' ? 'bg-purple-600 hover:bg-purple-700 flex-1' : 'flex-1 border-[hsl(220,15%,20%)] text-gray-300'}
                >
                  <Building2 className="w-4 h-4 mr-2" /> TED
                </Button>
              </div>
            </div>

            {withdrawMethod === 'PIX' && !bankData.pixKey && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm">Você precisa cadastrar sua chave PIX primeiro.</p>
                <Button size="sm" className="mt-2 bg-yellow-600" onClick={() => setActiveTab('bank')}>
                  Cadastrar PIX
                </Button>
              </div>
            )}

            {withdrawMethod === 'TED' && !bankData.accountNumber && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-400 text-sm">Você precisa cadastrar seus dados bancários primeiro.</p>
                <Button size="sm" className="mt-2 bg-yellow-600" onClick={() => setActiveTab('bank')}>
                  Cadastrar Dados
                </Button>
              </div>
            )}

            <div>
              <Label className="text-gray-300">Valor do Saque (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className={inputClass + " mt-1"}
              />
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount || (withdrawMethod === 'PIX' && !bankData.pixKey) || (withdrawMethod === 'TED' && !bankData.accountNumber)}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {isWithdrawing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><ArrowDownCircle className="w-4 h-4 mr-2" /> Solicitar Saque</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'bank' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* PIX */}
          <Card className="bg-card border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                Chave PIX
              </CardTitle>
              <CardDescription>Cadastre sua chave PIX para saques rápidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Tipo da Chave</Label>
                <select
                  value={bankData.pixKeyType || ''}
                  onChange={(e) => setBankData({ ...bankData, pixKeyType: e.target.value })}
                  className={selectClass + " mt-1"}
                >
                  <option value="">Selecione...</option>
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Telefone</option>
                  <option value="RANDOM">Chave Aleatória</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300">Chave PIX</Label>
                <Input
                  placeholder="Digite sua chave PIX"
                  value={bankData.pixKey || ''}
                  onChange={(e) => setBankData({ ...bankData, pixKey: e.target.value })}
                  className={inputClass + " mt-1"}
                />
              </div>
            </CardContent>
          </Card>

          {/* TED */}
          <Card className="bg-card border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Dados Bancários (TED)
              </CardTitle>
              <CardDescription>Cadastre seus dados para transferência TED</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Banco</Label>
                  <select
                    value={bankData.bankCode || ''}
                    onChange={(e) => {
                      const bank = BANKS.find((b) => b.code === e.target.value);
                      setBankData({ ...bankData, bankCode: e.target.value, bankName: bank?.name || '' });
                    }}
                    className={selectClass + " mt-1"}
                  >
                    <option value="">Selecione...</option>
                    {BANKS.map((b) => (
                      <option key={b.code} value={b.code}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-gray-300">Tipo de Conta</Label>
                  <select
                    value={bankData.accountType || ''}
                    onChange={(e) => setBankData({ ...bankData, accountType: e.target.value })}
                    className={selectClass + " mt-1"}
                  >
                    <option value="">Selecione...</option>
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Agência</Label>
                  <Input
                    placeholder="0000"
                    value={bankData.agencyNumber || ''}
                    onChange={(e) => setBankData({ ...bankData, agencyNumber: e.target.value })}
                    className={inputClass + " mt-1"}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Conta</Label>
                  <Input
                    placeholder="00000-0"
                    value={bankData.accountNumber || ''}
                    onChange={(e) => setBankData({ ...bankData, accountNumber: e.target.value })}
                    className={inputClass + " mt-1"}
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Titular da Conta</Label>
                <Input
                  placeholder="Nome completo"
                  value={bankData.accountHolder || ''}
                  onChange={(e) => setBankData({ ...bankData, accountHolder: e.target.value })}
                  className={inputClass + " mt-1"}
                />
              </div>
              <div>
                <Label className="text-gray-300">CPF/CNPJ do Titular</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={bankData.cpfCnpj || ''}
                  onChange={(e) => setBankData({ ...bankData, cpfCnpj: e.target.value })}
                  className={inputClass + " mt-1"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="md:col-span-2">
            <Button
              onClick={handleSaveBankData}
              disabled={isSavingBank}
              className="w-full md:w-auto bg-orange-500 hover:bg-orange-600"
            >
              {isSavingBank ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" /> Salvar Dados Bancários</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
