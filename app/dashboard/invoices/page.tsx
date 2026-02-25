'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/hooks/use-toast';
import {
    Receipt,
    DollarSign,
    Clock,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
    Loader2,
    ChevronDown,
    ChevronUp,
    User,
    Package,
    Filter,
} from 'lucide-react';

interface InvoiceOrder {
    id: string;
    price: number;
    originAddress: string;
    destinationAddress: string;
    distance: number;
    invoiceStatus: string | null;
    invoiceDueDate: string | null;
    invoicePaidAt: string | null;
    billingCycle: string | null;
    createdAt: string;
    completedAt: string | null;
}

interface ClientGroup {
    client: {
        id: string;
        name: string | null;
        email: string;
        phone: string | null;
        billingCycle: string | null;
    };
    orders: InvoiceOrder[];
    totalAmount: number;
    pendingCount: number;
    paidCount: number;
    overdueCount: number;
}

interface InvoiceData {
    clients: ClientGroup[];
    summary: {
        totalPending: number;
        totalPaid: number;
        totalOverdue: number;
        totalOrders: number;
    };
}

export default function InvoicesPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<InvoiceData | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [cycleFilter, setCycleFilter] = useState('all');
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/invoices?status=${statusFilter}&cycle=${cycleFilter}`);
            if (!res.ok) throw new Error('Erro ao carregar');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error(error);
            toast({ title: 'Erro', description: 'Não foi possível carregar os faturados', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter, cycleFilter]);

    const toggleClient = (clientId: string) => {
        setExpandedClients(prev => {
            const next = new Set(prev);
            if (next.has(clientId)) next.delete(clientId);
            else next.add(clientId);
            return next;
        });
    };

    const updateInvoiceStatus = async (orderIds: string[], status: string) => {
        const newUpdating = new Set(updatingOrders);
        orderIds.forEach(id => newUpdating.add(id));
        setUpdatingOrders(newUpdating);

        try {
            const res = await fetch('/api/invoices', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds, status }),
            });
            if (!res.ok) throw new Error('Erro ao atualizar');

            toast({
                title: 'Sucesso',
                description: status === 'PAID'
                    ? `${orderIds.length} pedido(s) marcado(s) como pago(s)`
                    : `${orderIds.length} pedido(s) atualizado(s)`,
            });
            fetchData();
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível atualizar', variant: 'destructive' });
        } finally {
            setUpdatingOrders(new Set());
        }
    };

    const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const getCycleName = (cycle: string | null) => {
        switch (cycle) {
            case 'WEEKLY': return 'Semanal';
            case 'BIWEEKLY': return 'Quinzenal';
            case 'MONTHLY': return 'Mensal';
            default: return 'Não definido';
        }
    };

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'PAID':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30"><CheckCircle className="w-3 h-3" /> Pago</span>;
            case 'OVERDUE':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30"><AlertTriangle className="w-3 h-3" /> Vencido</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"><Clock className="w-3 h-3" /> Pendente</span>;
        }
    };

    if (loading && !data) return <Loading />;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Pedidos Faturados</h1>
                    <p className="text-foreground/60">Gerencie cobranças faturadas por cliente</p>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* Summary Cards */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-card border-yellow-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-foreground/60">Pendente</p>
                                    <p className="text-2xl font-bold text-yellow-400">{formatCurrency(data.summary.totalPending)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-green-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-foreground/60">Pago</p>
                                    <p className="text-2xl font-bold text-green-400">{formatCurrency(data.summary.totalPaid)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-red-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-foreground/60">Vencido</p>
                                    <p className="text-2xl font-bold text-red-400">{formatCurrency(data.summary.totalOverdue)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-blue-500/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-foreground/60">Total Pedidos</p>
                                    <p className="text-2xl font-bold text-blue-400">{data.summary.totalOrders}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="bg-card">
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-foreground/60" />
                            <span className="text-sm text-foreground/60">Filtros:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'all', label: 'Todos', color: 'orange' },
                                { value: 'PENDING', label: 'Pendentes', color: 'yellow' },
                                { value: 'PAID', label: 'Pagos', color: 'green' },
                                { value: 'OVERDUE', label: 'Vencidos', color: 'red' },
                            ].map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setStatusFilter(filter.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === filter.value
                                            ? `bg-${filter.color}-500/20 text-${filter.color}-400 border border-${filter.color}-500/50`
                                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-gray-700 hidden sm:block" />
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: 'all', label: 'Todos Ciclos' },
                                { value: 'WEEKLY', label: 'Semanal' },
                                { value: 'BIWEEKLY', label: 'Quinzenal' },
                                { value: 'MONTHLY', label: 'Mensal' },
                            ].map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setCycleFilter(filter.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${cycleFilter === filter.value
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Client Groups */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            ) : !data || data.clients.length === 0 ? (
                <Card className="bg-card">
                    <CardContent className="py-12">
                        <EmptyState
                            icon={Receipt}
                            title="Nenhum pedido faturado"
                            description="Não há pedidos faturados com os filtros selecionados"
                        />
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {data.clients.map((group) => (
                        <Card key={group.client.id} className="bg-card hover:border-orange-500/30 transition-colors">
                            <CardHeader
                                className="cursor-pointer"
                                onClick={() => toggleClient(group.client.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg text-foreground">
                                                {group.client.name || group.client.email}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-3 mt-1">
                                                <span>{group.orders.length} pedido(s)</span>
                                                <span>•</span>
                                                <span className="text-orange-400 font-semibold">{formatCurrency(group.totalAmount)}</span>
                                                <span>•</span>
                                                <span>Ciclo: {getCycleName(group.client.billingCycle)}</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="hidden sm:flex items-center gap-2">
                                            {group.pendingCount > 0 && (
                                                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                                    {group.pendingCount} pendente(s)
                                                </span>
                                            )}
                                            {group.paidCount > 0 && (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                                    {group.paidCount} pago(s)
                                                </span>
                                            )}
                                            {group.overdueCount > 0 && (
                                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                                                    {group.overdueCount} vencido(s)
                                                </span>
                                            )}
                                        </div>
                                        {expandedClients.has(group.client.id)
                                            ? <ChevronUp className="w-5 h-5 text-foreground/40" />
                                            : <ChevronDown className="w-5 h-5 text-foreground/40" />
                                        }
                                    </div>
                                </div>
                            </CardHeader>

                            {expandedClients.has(group.client.id) && (
                                <CardContent className="pt-0 space-y-4">
                                    {/* Ação em lote */}
                                    {group.pendingCount > 0 && (
                                        <div className="flex justify-end">
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const pendingIds = group.orders
                                                        .filter(o => o.invoiceStatus !== 'PAID')
                                                        .map(o => o.id);
                                                    updateInvoiceStatus(pendingIds, 'PAID');
                                                }}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Marcar todos como pago
                                            </Button>
                                        </div>
                                    )}

                                    {/* Lista de pedidos */}
                                    <div className="space-y-2">
                                        {group.orders.map((order) => (
                                            <div
                                                key={order.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                                            >
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-mono text-foreground/60">#{order.id.slice(-6)}</span>
                                                        {getStatusBadge(order.invoiceStatus)}
                                                        {order.billingCycle && (
                                                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                                                                {getCycleName(order.billingCycle)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-foreground/80 truncate max-w-md">
                                                        {order.originAddress} → {order.destinationAddress}
                                                    </p>
                                                    <p className="text-xs text-foreground/40">
                                                        {formatDate(order.createdAt)}
                                                        {order.completedAt && ` • Entregue: ${formatDate(order.completedAt)}`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-lg font-bold text-orange-400">{formatCurrency(order.price)}</p>
                                                    {order.invoiceStatus !== 'PAID' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white"
                                                            disabled={updatingOrders.has(order.id)}
                                                            onClick={() => updateInvoiceStatus([order.id], 'PAID')}
                                                        >
                                                            {updatingOrders.has(order.id) ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
