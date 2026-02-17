'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Package, MapPin, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Order {
    id: string;
    originAddress: string;
    destinationAddress: string;
    status: string;
    price: number;
    createdAt: string;
    deliveryPerson?: { name: string };
    trackingCode?: string;
}

interface OrderTimelineProps {
    orders: Order[];
    title?: string;
    description?: string;
    maxItems?: number;
    showViewAll?: boolean;
    viewAllHref?: string;
}

export function OrderTimeline({
    orders,
    title = 'Histórico de Pedidos',
    description = 'Acompanhe seus pedidos recentes',
    maxItems = 5,
    showViewAll = true,
    viewAllHref = '/dashboard/orders',
}: OrderTimelineProps) {
    const displayOrders = orders.slice(0, maxItems);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
            return `${diffInMinutes} min atrás`;
        } else if (diffInHours < 24) {
            return `${diffInHours}h atrás`;
        } else {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            {title}
                        </CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    {showViewAll && orders.length > maxItems && (
                        <Link
                            href={viewAllHref}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Ver todos ({orders.length})
                        </Link>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {displayOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {displayOrders.map((order, index) => (
                            <Link
                                key={order.id}
                                href={`/dashboard/orders/${order.id}`}
                                className="block"
                            >
                                <div
                                    className={cn(
                                        'relative pl-8 pb-8 hover:bg-accent/50 -mx-4 px-4 rounded-lg transition-colors',
                                        index === displayOrders.length - 1 && 'pb-0'
                                    )}
                                >
                                    {/* Timeline line */}
                                    {index !== displayOrders.length - 1 && (
                                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                                    )}

                                    {/* Timeline dot */}
                                    <div className="absolute left-2 top-2 h-3 w-3 rounded-full border-2 border-primary bg-background" />

                                    <div className="space-y-2">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <StatusBadge status={order.status as any} type="order" />
                                                {order.trackingCode && (
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {order.trackingCode}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-primary">
                                                    R$ {order.price.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Addresses */}
                                        <div className="space-y-1 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                                <p className="text-muted-foreground line-clamp-1">
                                                    {order.originAddress}
                                                </p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                                <p className="text-muted-foreground line-clamp-1">
                                                    {order.destinationAddress}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Delivery person */}
                                        {order.deliveryPerson && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    Entregador: <span className="font-medium">{order.deliveryPerson.name}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
