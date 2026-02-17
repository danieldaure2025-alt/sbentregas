'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter } from '@/components/financial/date-range-filter';
import { FinancialLineChart } from '@/components/financial/financial-line-chart';
import { FinancialPieChart } from '@/components/financial/financial-pie-chart';
import { FinancialStatsCard } from '@/components/financial/financial-stats-card';
import { OrderTimeline } from '@/components/financial/order-timeline';
import {
    DollarSign,
    Package,
    TrendingUp,
    Download,
    Eye,
    EyeOff,
    XCircle,
    Store,
} from 'lucide-react';

interface FinancialData {
    totalRevenue: number;
    totalOrders: number;
    platformFees: number;
    netAmount: number;
    balanceDue: number;
    dailyRevenue: Array<{ date: string; value: number; label: string }>;
    paymentMethodDistribution: Array<{ name: string; value: number; color?: string }>;
    orders: any[];
    cancelledOrdersTotal: number;
    cancelledOrdersCount: number;
}

export default function EstablishmentFinancesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<FinancialData | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [showCancelled, setShowCancelled] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;

        // Check authorization
        const isEstablishment =
            session?.user?.role === 'ESTABLISHMENT' ||
            (session?.user?.role === 'CLIENT' && session?.user?.clientType === 'DELIVERY');

        if (!isEstablishment) {
            router.push('/dashboard');
            return;
        }

        fetchData();
    }, [session, status, router, dateRange, showCancelled]);

    const fetchData = async () => {
        try {
            const params = new URLSearchParams();
            if (dateRange.start) params.set('startDate', dateRange.start);
            if (dateRange.end) params.set('endDate', dateRange.end);
            params.set('includeCancelled', showCancelled.toString());

            const res = await fetch(`/api/finances/establishment?${params}`);

            if (!res.ok) throw new Error('Erro ao carregar dados');

            const financialData = await res.json();
            setData(financialData);
        } catch (error) {
            console.error('Error fetching financial data:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar os dados financeiros',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'excel' | 'csv') => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (dateRange.start) params.set('startDate', dateRange.start);
            if (dateRange.end) params.set('endDate', dateRange.end);
            params.set('format', format);

            const res = await fetch(`/api/finances/export?${params}`);

            if (!res.ok) throw new Error('Erro ao exportar');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `financeiro-estabelecimento-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: 'Sucesso!',
                description: `Relatório exportado em ${format.toUpperCase()}`,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível exportar o relatório',
                variant: 'destructive',
            });
        } finally {
            setExporting(false);
        }
    };

    if (loading || status === 'loading') {
        return <Loading />;
    }

    if (!data) {
        return <div>Erro ao carregar dados</div>;
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Store className="h-8 w-8 text-orange-500" />
                        Painel Financeiro
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe o faturamento e desempenho do seu estabelecimento
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleExport('excel')}
                        disabled={exporting}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                    </Button>
                </div>
            </div>

            {/* Date Filter */}
            <DateRangeFilter
                startDate={dateRange.start}
                endDate={dateRange.end}
                onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
                onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
                onClear={() => setDateRange({ start: '', end: '' })}
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FinancialStatsCard
                    title="Faturamento Total"
                    value={`R$ ${data.totalRevenue.toFixed(2)}`}
                    icon={DollarSign}
                    color="green"
                    description="Soma de todos os pedidos"
                />
                <FinancialStatsCard
                    title="Total de Pedidos"
                    value={data.totalOrders}
                    icon={Package}
                    color="blue"
                    description="Pedidos realizados"
                />
                <FinancialStatsCard
                    title="Taxa da Plataforma"
                    value={`R$ ${data.platformFees.toFixed(2)}`}
                    icon={TrendingUp}
                    color="orange"
                    description="10% do faturamento"
                />
                <FinancialStatsCard
                    title="Saldo Líquido"
                    value={`R$ ${data.netAmount.toFixed(2)}`}
                    icon={DollarSign}
                    color="purple"
                    description="Faturamento - Taxas"
                />
            </div>

            {/* Cancelled Orders Card */}
            {data.cancelledOrdersCount > 0 && (
                <Card className="border-red-500/50">
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Pedidos Cancelados</p>
                                    <p className="text-2xl font-bold">{data.cancelledOrdersCount}</p>
                                    <p className="text-sm text-red-600">R$ {data.cancelledOrdersTotal.toFixed(2)}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCancelled(!showCancelled)}
                                className="gap-2"
                            >
                                {showCancelled ? (
                                    <>
                                        <EyeOff className="h-4 w-4" />
                                        Ocultar
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4" />
                                        Mostrar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <FinancialLineChart
                    data={data.dailyRevenue}
                    title="Faturamento Diário"
                    description="Evolução do faturamento no período"
                    color="#10b981"
                    valueLabel="Faturamento"
                    formatValue={(value) => `R$ ${value.toFixed(2)}`}
                    showTrend
                />

                {/* Payment Methods Chart */}
                <FinancialPieChart
                    data={data.paymentMethodDistribution}
                    title="Métodos de Pagamento"
                    description="Distribuição por forma de pagamento"
                    formatValue={(value) => `R$ ${value.toFixed(2)}`}
                    showPercentage
                />
            </div>

            {/* Orders Timeline */}
            <OrderTimeline
                orders={data.orders.slice(0, 10)}
                title="Pedidos Recentes"
                description="Últimos pedidos do estabelecimento"
                maxItems={10}
                showViewAll
                viewAllHref="/dashboard/orders"
            />
        </div>
    );
}
