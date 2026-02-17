'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { useToast } from '@/hooks/use-toast';
import { DateRangeFilter, DateRange } from '@/components/financial/date-range-filter';
import { exportToExcel, exportToCSV, formatFinancialData, translateHeaders } from '@/lib/utils/export-excel';
import {
    Wallet,
    DollarSign,
    TrendingUp,
    XCircle,
    Package,
    Download,
    FileSpreadsheet,
    Eye,
    EyeOff,
} from 'lucide-react';

interface Order {
    id: string;
    originAddress: string;
    destinationAddress: string;
    status: string;
    price: number;
    distance: number;
    paymentMethod: string;
    createdAt: string;
    completedAt?: string;
    deliveryPerson?: { name: string; email: string } | null;
    transaction?: { totalAmount: number; deliveryFee: number; platformFee: number } | null;
}

interface FinanceData {
    totalSpent: number;
    cancelledTotal: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    orders: Order[];
    stats: {
        byStatus: { status: string; count: number; total: number }[];
        byPaymentMethod: { method: string; count: number; total: number }[];
    };
}

export default function ClientFinancesPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<FinanceData | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>({});
    const [showCancelled, setShowCancelled] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateRange.startDate) params.set('startDate', dateRange.startDate);
            if (dateRange.endDate) params.set('endDate', dateRange.endDate);
            params.set('includeCancelled', showCancelled.toString());

            const res = await fetch(`/api/finances/client?${params.toString()}`);

            if (!res.ok) throw new Error('Erro ao carregar dados');

            const result = await res.json();
            setData(result);
        } catch (error) {
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
    }, [dateRange, showCancelled]);

    const handleExportExcel = () => {
        if (!data?.orders) return;

        const exportData = data.orders.map(order => ({
            ID: order.id,
            Origem: order.originAddress,
            Destino: order.destinationAddress,
            Status: order.status,
            'Valor (R$)': order.price,
            'Taxa Entrega (R$)': order.transaction?.deliveryFee || 0,
            'Método Pagamento': order.paymentMethod,
            'Data Criação': new Date(order.createdAt).toLocaleString('pt-BR'),
            'Data Conclusão': order.completedAt ? new Date(order.completedAt).toLocaleString('pt-BR') : '-',
            'Entregador': order.deliveryPerson?.name || '-',
        }));

        exportToExcel(exportData, { filename: 'meus_pedidos', sheetName: 'Pedidos' });
        toast({ title: 'Exportado!', description: 'Planilha Excel gerada com sucesso' });
    };

    const handleExportCSV = () => {
        if (!data?.orders) return;

        const exportData = data.orders.map(order => ({
            ID: order.id,
            Origem: order.originAddress,
            Destino: order.destinationAddress,
            Status: order.status,
            'Valor': order.price.toFixed(2),
            'Taxa Entrega': (order.transaction?.deliveryFee || 0).toFixed(2),
            'Método Pagamento': order.paymentMethod,
            'Data Criação': new Date(order.createdAt).toLocaleString('pt-BR'),
            'Data Conclusão': order.completedAt ? new Date(order.completedAt).toLocaleString('pt-BR') : '-',
            'Entregador': order.deliveryPerson?.name || '-',
        }));

        exportToCSV(exportData, { filename: 'meus_pedidos' });
        toast({ title: 'Exportado!', description: 'Arquivo CSV gerado com sucesso' });
    };

    if (loading) return <Loading />;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-orange-500" />
                        Minhas Finanças
                    </h1>
                    <p className="text-gray-400">Acompanhe seus gastos e pedidos</p>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-2">
                    <Button
                        onClick={handleExportExcel}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                    </Button>
                    <Button
                        onClick={handleExportCSV}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid md:grid-cols-2 gap-4">
                <DateRangeFilter onDateChange={setDateRange} defaultPeriod="month" />

                <Card className="bg-card border-[hsl(220,15%,20%)]">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400">Pedidos Cancelados</p>
                                <p className="text-2xl font-bold text-white">{data?.cancelledOrders || 0}</p>
                            </div>
                            <Button
                                variant={showCancelled ? 'default' : 'outline'}
                                onClick={() => setShowCancelled(!showCancelled)}
                                className={showCancelled ? 'bg-orange-500 hover:bg-orange-600' : 'border-[hsl(220,15%,20%)]'}
                            >
                                {showCancelled ? (
                                    <><Eye className="w-4 h-4 mr-2" /> Mostrando</>
                                ) : (
                                    <><EyeOff className="w-4 h-4 mr-2" /> Ocultos</>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-card border-green-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-green-400 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-xs">Total Gasto</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-white">
                            R$ {data?.totalSpent?.toFixed(2) || '0,00'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-blue-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <Package className="w-4 h-4" />
                            <span className="text-xs">Pedidos Ativos</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-white">
                            {data?.activeOrders || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-orange-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-orange-400 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">Concluídos</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-white">
                            {data?.completedOrders || 0}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-red-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-400 mb-1">
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs">Cancelados</span>
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-white">
                            {data?.cancelledOrders || 0}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            R$ {data?.cancelledTotal?.toFixed(2) || '0,00'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Orders List */}
            <Card className="bg-card border-[hsl(220,15%,20%)]">
                <CardHeader>
                    <CardTitle className="text-white">
                        Histórico de Pedidos ({data?.orders?.length || 0})
                    </CardTitle>
                    <CardDescription>
                        {showCancelled ? 'Incluindo pedidos cancelados' : 'Apenas pedidos ativos e concluídos'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {data?.orders?.length ? (
                            data.orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="p-4 rounded-lg bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,20%)]"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <p className="text-gray-400 text-sm truncate">De: {order.originAddress}</p>
                                            <p className="text-white truncate">Para: {order.destinationAddress}</p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-green-400 font-bold">
                                                R$ {order.transaction?.totalAmount?.toFixed(2) || order.price.toFixed(2)}
                                            </p>
                                            <span className={`text-xs px-2 py-1 rounded ${order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' :
                                                order.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                                        <span>{order.paymentMethod}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-8">Nenhum pedido encontrado no período</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
