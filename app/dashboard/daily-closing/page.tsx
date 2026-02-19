'use client';

import { Loading } from '@/components/shared/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Download,
    Package,
    Phone,
    RefreshCw,
    TrendingUp,
    Truck,
    User,
    Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { exportToCSV } from '@/lib/export-csv';

interface ClientSummary {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    orders: number;
    totalValue: number;
    platformFee: number;
    deliveryFee: number;
    paymentMethods: string[];
    delivered: number;
    pending: number;
}

interface DeliveryPersonSummary {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    orders: number;
    totalDeliveryFee: number;
    totalValue: number;
    delivered: number;
    pending: number;
}

interface DailyClosingData {
    date: string;
    summary: {
        totalRevenue: number;
        totalPlatformFees: number;
        totalDeliveryFees: number;
        totalOrders: number;
        deliveredCount: number;
        pendingCount: number;
    };
    byClient: ClientSummary[];
    byDeliveryPerson: DeliveryPersonSummary[];
}

const paymentMethodLabels: Record<string, string> = {
    CREDIT_CARD: 'Cartão',
    PIX: 'PIX',
    DEBIT_CARD: 'Débito',
    CASH: 'Dinheiro',
    END_OF_DAY: 'Diária',
};

export default function DailyClosingPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DailyClosingData | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finances/daily-closing?date=${selectedDate}`);
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
                description: 'Não foi possível carregar os dados de fechamento',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const changeDate = (delta: number) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

    const formatDateDisplay = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    if (loading) return <Loading />;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Fechamento Diário</h1>
                    <p className="text-foreground/60 capitalize">{formatDateDisplay(selectedDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-card border border-border rounded-lg px-4 py-2 text-foreground [color-scheme:dark]"
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    {!isToday && (
                        <Button variant="outline" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                            Hoje
                        </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => {
                        if (!data) return;
                        const allRows = [
                            ...data.byClient.map(c => ({
                                tipo: 'Cliente' as string,
                                nome: c.name,
                                email: c.email,
                                telefone: c.phone || '-',
                                pedidos: c.orders,
                                entregues: c.delivered,
                                pendentes: c.pending,
                                valorTotal: c.totalValue,
                                taxaPlataforma: c.platformFee,
                                frete: c.deliveryFee,
                            })),
                            ...data.byDeliveryPerson.map(d => ({
                                tipo: 'Entregador' as string,
                                nome: d.name,
                                email: d.email,
                                telefone: d.phone || '-',
                                pedidos: d.orders,
                                entregues: d.delivered,
                                pendentes: d.pending,
                                valorTotal: d.totalValue,
                                taxaPlataforma: 0,
                                frete: d.totalDeliveryFee,
                            })),
                        ];
                        exportToCSV(allRows, [
                            { header: 'Tipo', accessor: (r) => r.tipo },
                            { header: 'Nome', accessor: (r) => r.nome },
                            { header: 'Email', accessor: (r) => r.email },
                            { header: 'Telefone', accessor: (r) => r.telefone },
                            { header: 'Pedidos', accessor: (r) => r.pedidos },
                            { header: 'Entregues', accessor: (r) => r.entregues },
                            { header: 'Pendentes', accessor: (r) => r.pendentes },
                            { header: 'Valor Total (R$)', accessor: (r) => r.valorTotal },
                            { header: 'Taxa Plataf. (R$)', accessor: (r) => r.taxaPlataforma },
                            { header: 'Frete (R$)', accessor: (r) => r.frete },
                        ], `fechamento_${selectedDate}`);
                    }}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {data && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-card border-orange-500/30">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-foreground/60">Total Faturado</p>
                                        <p className="text-2xl font-bold text-orange-500">{formatCurrency(data.summary.totalRevenue)}</p>
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
                                        <p className="text-2xl font-bold text-green-500">{formatCurrency(data.summary.totalPlatformFees)}</p>
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
                                        <p className="text-2xl font-bold text-blue-500">{formatCurrency(data.summary.totalDeliveryFees)}</p>
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
                                        <p className="text-sm text-foreground/60">Total Pedidos</p>
                                        <p className="text-2xl font-bold text-purple-500">{data.summary.totalOrders}</p>
                                        <div className="flex gap-2 mt-1 text-xs">
                                            <span className="text-green-500">{data.summary.deliveredCount} entregues</span>
                                            {data.summary.pendingCount > 0 && (
                                                <span className="text-yellow-500">{data.summary.pendingCount} em andamento</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                                        <Package className="h-6 w-6 text-purple-500" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* By Client */}
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <User className="h-5 w-5 text-orange-500" />
                                Por Cliente
                                <span className="text-sm font-normal text-foreground/60">({data.byClient.length} clientes)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.byClient.length === 0 ? (
                                <div className="text-center py-8 text-foreground/60">
                                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Nenhum pedido nesta data</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-3 px-2 text-foreground/60 font-medium">Cliente</th>
                                                <th className="text-center py-3 px-2 text-foreground/60 font-medium">Pedidos</th>
                                                <th className="text-center py-3 px-2 text-foreground/60 font-medium">Status</th>
                                                <th className="text-right py-3 px-2 text-foreground/60 font-medium">Valor Total</th>
                                                <th className="text-right py-3 px-2 text-foreground/60 font-medium">Taxa Plataf.</th>
                                                <th className="text-right py-3 px-2 text-foreground/60 font-medium">Frete</th>
                                                <th className="text-left py-3 px-2 text-foreground/60 font-medium">Pagamento</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.byClient.map((client) => (
                                                <tr key={client.id} className="border-b border-border/50 hover:bg-background/50 transition-colors">
                                                    <td className="py-3 px-2">
                                                        <div>
                                                            <p className="font-medium text-foreground">{client.name}</p>
                                                            <p className="text-xs text-foreground/40">{client.email}</p>
                                                            {client.phone && (
                                                                <p className="text-xs text-foreground/40 flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" /> {client.phone}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-2 font-semibold text-foreground">{client.orders}</td>
                                                    <td className="text-center py-3 px-2">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-green-500 text-xs">{client.delivered}✓</span>
                                                            {client.pending > 0 && <span className="text-yellow-500 text-xs">{client.pending}⏳</span>}
                                                        </div>
                                                    </td>
                                                    <td className="text-right py-3 px-2 font-bold text-orange-500">{formatCurrency(client.totalValue)}</td>
                                                    <td className="text-right py-3 px-2 text-green-500">{formatCurrency(client.platformFee)}</td>
                                                    <td className="text-right py-3 px-2 text-blue-500">{formatCurrency(client.deliveryFee)}</td>
                                                    <td className="py-3 px-2">
                                                        <div className="flex flex-wrap gap-1">
                                                            {client.paymentMethods.map((pm) => (
                                                                <span key={pm} className="text-xs bg-foreground/5 border border-border text-foreground/70 px-2 py-0.5 rounded">
                                                                    {paymentMethodLabels[pm] || pm}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-orange-500/30">
                                                <td className="py-3 px-2 font-bold text-foreground">TOTAL</td>
                                                <td className="text-center py-3 px-2 font-bold text-foreground">{data.summary.totalOrders}</td>
                                                <td className="text-center py-3 px-2">
                                                    <span className="text-green-500 text-xs font-bold">{data.summary.deliveredCount}✓</span>
                                                </td>
                                                <td className="text-right py-3 px-2 font-bold text-orange-500">{formatCurrency(data.summary.totalRevenue)}</td>
                                                <td className="text-right py-3 px-2 font-bold text-green-500">{formatCurrency(data.summary.totalPlatformFees)}</td>
                                                <td className="text-right py-3 px-2 font-bold text-blue-500">{formatCurrency(data.summary.totalDeliveryFees)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* By Delivery Person */}
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-500" />
                                Por Entregador
                                <span className="text-sm font-normal text-foreground/60">({data.byDeliveryPerson.length} motoboys)</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.byDeliveryPerson.length === 0 ? (
                                <div className="text-center py-8 text-foreground/60">
                                    <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Nenhuma entrega atribuída nesta data</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-3 px-2 text-foreground/60 font-medium">Entregador</th>
                                                <th className="text-center py-3 px-2 text-foreground/60 font-medium">Entregas</th>
                                                <th className="text-center py-3 px-2 text-foreground/60 font-medium">Status</th>
                                                <th className="text-right py-3 px-2 text-foreground/60 font-medium">Valor Pedidos</th>
                                                <th className="text-right py-3 px-2 text-foreground/60 font-medium">Frete (a receber)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.byDeliveryPerson.map((dp) => (
                                                <tr key={dp.id} className="border-b border-border/50 hover:bg-background/50 transition-colors">
                                                    <td className="py-3 px-2">
                                                        <div>
                                                            <p className="font-medium text-foreground">{dp.name}</p>
                                                            <p className="text-xs text-foreground/40">{dp.email}</p>
                                                            {dp.phone && (
                                                                <p className="text-xs text-foreground/40 flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" /> {dp.phone}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center py-3 px-2 font-semibold text-foreground">{dp.orders}</td>
                                                    <td className="text-center py-3 px-2">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="text-green-500 text-xs">{dp.delivered}✓</span>
                                                            {dp.pending > 0 && <span className="text-yellow-500 text-xs">{dp.pending}⏳</span>}
                                                        </div>
                                                    </td>
                                                    <td className="text-right py-3 px-2 text-foreground">{formatCurrency(dp.totalValue)}</td>
                                                    <td className="text-right py-3 px-2 font-bold text-blue-500">{formatCurrency(dp.totalDeliveryFee)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-blue-500/30">
                                                <td className="py-3 px-2 font-bold text-foreground">TOTAL</td>
                                                <td className="text-center py-3 px-2 font-bold text-foreground">
                                                    {data.byDeliveryPerson.reduce((s, d) => s + d.orders, 0)}
                                                </td>
                                                <td className="text-center py-3 px-2">
                                                    <span className="text-green-500 text-xs font-bold">
                                                        {data.byDeliveryPerson.reduce((s, d) => s + d.delivered, 0)}✓
                                                    </span>
                                                </td>
                                                <td className="text-right py-3 px-2 font-bold text-foreground">
                                                    {formatCurrency(data.byDeliveryPerson.reduce((s, d) => s + d.totalValue, 0))}
                                                </td>
                                                <td className="text-right py-3 px-2 font-bold text-blue-500">
                                                    {formatCurrency(data.summary.totalDeliveryFees)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
