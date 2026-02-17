'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel, exportToCSV } from '@/lib/utils/export-excel';
import {
    Calendar,
    DollarSign,
    Users,
    Package,
    TrendingUp,
    FileSpreadsheet,
    Download,
    ChevronDown,
    ChevronUp,
    Bike,
    MapPin,
    Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyClosingData {
    date: string;
    summary: {
        totalOrders: number;
        totalRevenue: number;
        totalDeliveryPersons: number;
        totalClients: number;
        ordersByStatus: {
            delivered: number;
            inProgress: number;
            pending: number;
        };
    };
    clients: Array<{
        clientId: string;
        clientName: string;
        clientEmail: string;
        clientPhone: string | null;
        totalOrders: number;
        totalValue: number;
        deliveryPersons: string[];
        orders: Array<{
            id: string;
            orderNumber: string | null;
            status: string;
            price: number;
            distance: number;
            paymentMethod: string | null;
            createdAt: string;
            deliveryPerson: {
                id: string;
                name: string | null;
            } | null;
            originAddress: string;
            destinationAddress: string;
        }>;
    }>;
}

export default function DailyClosingPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<DailyClosingData | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/daily-closing?date=${selectedDate}`);

            if (!res.ok) {
                if (res.status === 403) {
                    router.push('/dashboard');
                    return;
                }
                throw new Error('Erro ao carregar dados');
            }

            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar os dados do fechamento',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const toggleClientExpanded = (clientId: string) => {
        const newExpanded = new Set(expandedClients);
        if (newExpanded.has(clientId)) {
            newExpanded.delete(clientId);
        } else {
            newExpanded.add(clientId);
        }
        setExpandedClients(newExpanded);
    };

    const handleExportSummary = () => {
        if (!data?.clients?.length) return;
        const exportData = data.clients.map((c) => ({
            Cliente: c.clientName,
            Email: c.clientEmail,
            Telefone: c.clientPhone || '-',
            'Total de Pedidos': c.totalOrders,
            'Valor Total (R$)': c.totalValue.toFixed(2),
            'Entregadores': c.deliveryPersons.join(', '),
        }));
        exportToExcel(exportData, {
            filename: `fechamento_${selectedDate}`,
            sheetName: 'Fechamento'
        });
    };

    const handleExportDetailed = () => {
        if (!data?.clients?.length) return;
        const exportData: any[] = [];

        data.clients.forEach((client) => {
            client.orders.forEach((order) => {
                exportData.push({
                    Cliente: client.clientName,
                    'Email Cliente': client.clientEmail,
                    'Número Pedido': order.orderNumber || order.id.substring(0, 8),
                    Status: order.status,
                    Origem: order.originAddress,
                    Destino: order.destinationAddress,
                    'Entregador': order.deliveryPerson?.name || 'Não atribuído',
                    'Distância (km)': order.distance.toFixed(2),
                    'Valor (R$)': order.price.toFixed(2),
                    'Forma Pagamento': order.paymentMethod || '-',
                    'Data/Hora': new Date(order.createdAt).toLocaleString('pt-BR'),
                });
            });
        });

        exportToCSV(exportData, { filename: `fechamento_detalhado_${selectedDate}` });
    };

    const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            DELIVERED: 'Entregue',
            PICKED_UP: 'Coletado',
            IN_TRANSIT: 'Em trânsito',
            ACCEPTED: 'Aceito',
            PENDING: 'Pendente',
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            DELIVERED: 'text-green-500 bg-green-500/10',
            PICKED_UP: 'text-blue-500 bg-blue-500/10',
            IN_TRANSIT: 'text-purple-500 bg-purple-500/10',
            ACCEPTED: 'text-yellow-500 bg-yellow-500/10',
            PENDING: 'text-orange-500 bg-orange-500/10',
        };
        return colors[status] || 'text-gray-500 bg-gray-500/10';
    };

    if (loading && !data) return <Loading />;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Fechamento Diário</h1>
                    <p className="text-foreground/60">Relatório de pedidos por cliente e entregadores</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExportSummary} size="sm" className="bg-green-600 hover:bg-green-700">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />Resumo Excel
                    </Button>
                    <Button onClick={handleExportDetailed} size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4 mr-2" />Detalhado CSV
                    </Button>
                </div>
            </div>

            {/* Date Selector */}
            <Card className="bg-card">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        <div className="flex-1">
                            <label className="text-sm font-medium text-foreground/80 mb-2 block">
                                Selecione a Data
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
                            />
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-foreground/60">Data selecionada</p>
                            <p className="text-lg font-semibold text-foreground">
                                {format(new Date(selectedDate + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {data && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-card border-orange-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-foreground/60">Total de Pedidos</p>
                                        <p className="text-2xl font-bold text-orange-500">{data.summary.totalOrders}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                                        <Package className="h-6 w-6 text-orange-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-green-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-foreground/60">Receita Total</p>
                                        <p className="text-2xl font-bold text-green-500">{formatCurrency(data.summary.totalRevenue)}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <DollarSign className="h-6 w-6 text-green-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-blue-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-foreground/60">Clientes Atendidos</p>
                                        <p className="text-2xl font-bold text-blue-500">{data.summary.totalClients}</p>
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
                                        <p className="text-sm text-foreground/60">Entregadores Ativos</p>
                                        <p className="text-2xl font-bold text-purple-500">{data.summary.totalDeliveryPersons}</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                        <Bike className="h-6 w-6 text-purple-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Status Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-card">
                            <CardContent className="pt-4">
                                <p className="text-sm text-foreground/60">Entregues</p>
                                <p className="text-xl font-bold text-green-500">{data.summary.ordersByStatus.delivered}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card">
                            <CardContent className="pt-4">
                                <p className="text-sm text-foreground/60">Em Andamento</p>
                                <p className="text-xl font-bold text-blue-500">{data.summary.ordersByStatus.inProgress}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card">
                            <CardContent className="pt-4">
                                <p className="text-sm text-foreground/60">Pendentes</p>
                                <p className="text-xl font-bold text-orange-500">{data.summary.ordersByStatus.pending}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Clients Table */}
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-foreground">Pedidos por Cliente</CardTitle>
                            <CardDescription>Detalhamento de pedidos agrupados por cliente</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.clients.length === 0 ? (
                                <div className="text-center py-8 text-foreground/60">
                                    <Package className="h-12 w-12 mx-auto mb-4 text-foreground/40" />
                                    <p>Nenhum pedido encontrado para esta data</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data.clients.map((client) => (
                                        <div key={client.clientId} className="border border-border rounded-lg overflow-hidden">
                                            <div
                                                className="p-4 bg-background/50 cursor-pointer hover:bg-background/80 transition-colors"
                                                onClick={() => toggleClientExpanded(client.clientId)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="h-5 w-5 text-orange-500" />
                                                            <div>
                                                                <p className="font-semibold text-foreground">{client.clientName}</p>
                                                                <p className="text-sm text-foreground/60">{client.clientEmail}</p>
                                                                {client.clientPhone && (
                                                                    <p className="text-sm text-foreground/60">{client.clientPhone}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-sm text-foreground/60">Pedidos</p>
                                                            <p className="text-xl font-bold text-orange-500">{client.totalOrders}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-foreground/60">Total</p>
                                                            <p className="text-xl font-bold text-green-500">{formatCurrency(client.totalValue)}</p>
                                                        </div>
                                                        <div className="text-right min-w-[150px]">
                                                            <p className="text-sm text-foreground/60 mb-1">Entregadores</p>
                                                            <div className="flex flex-wrap gap-1 justify-end">
                                                                {client.deliveryPersons.slice(0, 2).map((dp, idx) => (
                                                                    <span key={idx} className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">
                                                                        {dp.split(' ')[0]}
                                                                    </span>
                                                                ))}
                                                                {client.deliveryPersons.length > 2 && (
                                                                    <span className="text-xs text-foreground/60">+{client.deliveryPersons.length - 2}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {expandedClients.has(client.clientId) ? (
                                                            <ChevronUp className="h-5 w-5 text-foreground/60" />
                                                        ) : (
                                                            <ChevronDown className="h-5 w-5 text-foreground/60" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {expandedClients.has(client.clientId) && (
                                                <div className="p-4 space-y-3 bg-background">
                                                    {client.orders.map((order) => (
                                                        <div key={order.id} className="border border-border/50 rounded-lg p-3 hover:border-orange-500/50 transition-colors">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-mono text-foreground/80">
                                                                            #{order.orderNumber || order.id.substring(0, 8)}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                                            {getStatusLabel(order.status)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-start gap-2 text-sm">
                                                                        <MapPin className="h-4 w-4 text-foreground/60 mt-0.5 flex-shrink-0" />
                                                                        <div>
                                                                            <p className="text-foreground/80"><span className="font-medium">Origem:</span> {order.originAddress}</p>
                                                                            <p className="text-foreground/80"><span className="font-medium">Destino:</span> {order.destinationAddress}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-sm text-foreground/60">
                                                                        <div className="flex items-center gap-1">
                                                                            <Bike className="h-4 w-4" />
                                                                            <span>{order.deliveryPerson?.name || 'Não atribuído'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <Clock className="h-4 w-4" />
                                                                            <span>{new Date(order.createdAt).toLocaleString('pt-BR')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold text-green-500">{formatCurrency(order.price)}</p>
                                                                    <p className="text-sm text-foreground/60">{order.distance.toFixed(1)} km</p>
                                                                    {order.paymentMethod && (
                                                                        <p className="text-xs text-foreground/60">{order.paymentMethod}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
