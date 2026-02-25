'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loading } from '@/components/shared/loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { CheckoutWrapper } from '@/components/checkout/checkout-wrapper';
import { DeliveryMap } from '@/components/maps/delivery-map';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin,
  Navigation,
  DollarSign,
  User,
  Phone,
  Star,
  Clock,
  CheckCircle,
  Loader2,
  CreditCard,
  AlertCircle,
  MapPinned,
  RefreshCw,
  MessageCircle,
  XCircle,
} from 'lucide-react';
import { UserRole } from '@prisma/client';
import { ChatBox } from '@/components/chat/chat-box';

interface TrackingData {
  hasLocation: boolean;
  message?: string;
  deliveryPerson?: {
    name: string;
    phone?: string;
    latitude: number;
    longitude: number;
    lastUpdate: string;
  };
  orderStatus?: string;
}

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  notes?: string;
  status: string;
  price: number;
  distance: number;
  paymentMethod?: string;
  paymentIntentId?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  completedAt?: string;
  client: { id: string; name: string; email: string; phone?: string };
  deliveryPerson?: { id: string; name: string; phone?: string; rating?: number };
  transactions: Array<{
    totalAmount: number;
    platformFee: number;
    deliveryFee: number;
    paymentMethod: string;
    paymentStatus: string;
  }>;
  rating?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isConfirmingPix, setIsConfirmingPix] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const orderId = params?.id as string;

  // Fetch tracking data
  const fetchTracking = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      if (res.ok) {
        const data = await res.json();
        setTracking(data);
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
    }
  }, [orderId]);

  // Auto-refresh tracking every 15 seconds for active deliveries
  useEffect(() => {
    if (order && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status)) {
      fetchTracking();
      const interval = setInterval(fetchTracking, 15000);
      return () => clearInterval(interval);
    }
  }, [order?.status, fetchTracking]);

  // Check if payment was successful (from redirect)
  useEffect(() => {
    if (searchParams?.get('payment') === 'success') {
      setPaymentSuccess(true);
      toast({
        title: 'Pagamento Confirmado!',
        description: 'Seu pedido foi pago com sucesso.',
      });
      // Remove query param from URL
      router.replace(`/dashboard/orders/${orderId}`);
    }
  }, [searchParams, orderId, router, toast]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Fetch order
        const res = await fetch(`/api/orders/${orderId}`);

        if (res.ok) {
          const data = await res.json();
          setOrder(data?.order ?? null);
        } else {
          toast({
            title: 'Erro',
            description: 'Pedido não encontrado',
            variant: 'destructive',
          });
          router.push('/dashboard/orders');
        }

        // Check if user is admin
        const authRes = await fetch('/api/auth/session');
        if (authRes.ok) {
          const authData = await authRes.json();
          setIsAdmin(authData?.user?.role === 'ADMIN');
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, router, toast]);

  const handleSubmitRating = async () => {
    setIsSubmittingRating(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order?.id,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao enviar avaliação');
      }

      toast({
        title: 'Sucesso!',
        description: 'Avaliação registrada com sucesso',
      });

      // Refresh order data
      const refreshRes = await fetch(`/api/orders/${orderId}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setOrder(refreshData?.order ?? null);
      }

      setShowRatingForm(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao enviar avaliação',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsConfirmingPix(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao confirmar pagamento');
      }

      const paymentLabel = order?.paymentMethod === 'ON_DELIVERY' ? 'Na Entrega' :
        order?.paymentMethod === 'INVOICED' ? 'Faturada' :
          order?.paymentMethod === 'CASH' ? 'Dinheiro' : 'Final do Dia';

      toast({
        title: 'Pagamento Confirmado!',
        description: data?.message || `${paymentLabel} confirmado.`,
      });

      // Refresh order data
      const refreshRes = await fetch(`/api/orders/${orderId}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setOrder(refreshData?.order ?? null);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao confirmar pagamento',
        variant: 'destructive',
      });
    } finally {
      setIsConfirmingPix(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao cancelar pedido');
      }

      toast({
        title: 'Pedido Cancelado',
        description: 'Seu pedido foi cancelado com sucesso.',
      });

      // Refresh order data
      const refreshRes = await fetch(`/api/orders/${orderId}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setOrder(refreshData?.order ?? null);
      }
      setShowCancelConfirm(false);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao cancelar pedido',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Check if order can be cancelled (only AWAITING_PAYMENT or PENDING)
  const canCancel = order && ['AWAITING_PAYMENT', 'PENDING'].includes(order.status);

  if (loading) {
    return <Loading />;
  }

  if (!order) {
    return <div>Pedido não encontrado</div>;
  }

  // Can rate if order is delivered, not yet rated, and has delivery person
  const canRate =
    order.status === 'DELIVERED' &&
    !order?.rating &&
    order?.deliveryPerson;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Detalhes do Pedido</h1>
          <p className="text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status as any} type="order" />
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <Card className="border-red-500/50 bg-red-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              Confirmar Cancelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground/80">
              Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Sim, Cancelar Pedido
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={isCancelling}
              >
                Não, Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>Endereços</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="font-medium">Origem</p>
              <p className="text-muted-foreground">{order.originAddress}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Navigation className="w-5 h-5 text-orange-600 mt-1" />
            <div>
              <p className="font-medium">Destino</p>
              <p className="text-muted-foreground">{order.destinationAddress}</p>
            </div>
          </div>
          {order?.notes && (
            <div className="pt-2 border-t">
              <p className="font-medium mb-1">Observações</p>
              <p className="text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Tracking for active deliveries */}
      {['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status) && (
        <Card className="border-orange-500/50 bg-orange-900/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-orange-400">
                <MapPinned className="w-5 h-5" />
                Rastreamento em Tempo Real
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchTracking}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tracking?.hasLocation && tracking.deliveryPerson ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tracking.deliveryPerson.name}</p>
                      {tracking.deliveryPerson.phone && (
                        <a href={`tel:${tracking.deliveryPerson.phone}`} className="text-sm text-blue-400 hover:underline">
                          {tracking.deliveryPerson.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-xs text-foreground/60">
                    <p>Última atualização:</p>
                    <p>{new Date(tracking.deliveryPerson.lastUpdate).toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-foreground/60 text-sm">{tracking?.message || 'Aguardando localização do entregador...'}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delivery Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Mapa da Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryMap
            originAddress={order.originAddress}
            destinationAddress={order.destinationAddress}
            showRoute={true}
            height="350px"
            deliveryPersonLocation={
              tracking?.hasLocation && tracking.deliveryPerson
                ? {
                  lat: tracking.deliveryPerson.latitude,
                  lng: tracking.deliveryPerson.longitude,
                  name: tracking.deliveryPerson.name,
                }
                : null
            }
          />
        </CardContent>
      </Card>

      {/* Payment Section for AWAITING_PAYMENT status */}
      {order.status === 'AWAITING_PAYMENT' && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="w-5 h-5" />
              Pagamento Pendente
            </CardTitle>
            <CardDescription>
              Complete o pagamento para confirmar seu pedido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
              <CheckoutWrapper
                orderId={order.id}
                amount={order.price}
                onSuccess={() => {
                  setPaymentSuccess(true);
                  toast({
                    title: 'Pagamento Confirmado!',
                    description: 'Seu pedido foi pago com sucesso.',
                  });
                  // Refresh order data
                  window.location.reload();
                }}
                onError={(error) => {
                  toast({
                    title: 'Erro no Pagamento',
                    description: error,
                    variant: 'destructive',
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Payment Confirmation for CASH/END_OF_DAY */}
      {isAdmin &&
        order.status !== 'AWAITING_PAYMENT' &&
        order.status !== 'CANCELLED' &&
        (order.paymentMethod === 'CASH' || order.paymentMethod === 'END_OF_DAY' || order.paymentMethod === 'ON_DELIVERY') &&
        order?.transactions?.[0]?.paymentStatus === 'PENDING' && (
          <Card className="border-green-500/30 bg-green-900/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <DollarSign className="w-5 h-5" />
                Confirmar Pagamento - {order.paymentMethod === 'CASH' ? 'Dinheiro' : order.paymentMethod === 'ON_DELIVERY' ? 'Na Entrega' : 'Final do Dia'}
              </CardTitle>
              <CardDescription className="text-foreground/70">
                Confirme o recebimento do pagamento ({order.paymentMethod === 'CASH' ? 'dinheiro' : order.paymentMethod === 'ON_DELIVERY' ? 'na entrega' : 'final do dia'})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-foreground/70">Valor Total</span>
                    <span className="font-bold text-xl text-green-400">R$ {order.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/60">Status do Pagamento</span>
                    <span className="text-yellow-400">Pendente</span>
                  </div>
                </div>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={isConfirmingPix}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isConfirmingPix ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirmar Recebimento {order.paymentMethod === 'CASH' ? 'em Dinheiro' : order.paymentMethod === 'ON_DELIVERY' ? '- Na Entrega' : '- Final do Dia'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Linha do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Pedido Criado</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            {order?.acceptedAt && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Aceito pelo Entregador</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.acceptedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
            {order?.pickedUpAt && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">Coletado</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.pickedUpAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
            {order?.inTransitAt && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Em Trânsito</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.inTransitAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
            {order?.completedAt && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Entregue</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.completedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* People Involved */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Cliente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{order?.client?.name}</p>
            <p className="text-sm text-muted-foreground">{order?.client?.email}</p>
            {order?.client?.phone && (
              <p className="text-sm text-muted-foreground flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>{order.client.phone}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {order?.deliveryPerson && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Entregador</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{order.deliveryPerson.name}</p>
              {order?.deliveryPerson?.phone && (
                <p className="text-sm text-muted-foreground flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>{order.deliveryPerson.phone}</span>
                </p>
              )}
              {order?.deliveryPerson?.rating !== undefined &&
                order?.deliveryPerson?.rating !== null && (
                  <p className="text-sm flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span>{order.deliveryPerson.rating.toFixed(1)}</span>
                  </p>
                )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment */}
      {order?.transactions?.[0] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Pagamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distância</span>
              <span className="font-medium">{order.distance} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de Entrega</span>
              <span className="font-medium">
                R$ {order?.transactions?.[0]?.deliveryFee?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa da Plataforma</span>
              <span className="font-medium">
                R$ {order?.transactions?.[0]?.platformFee?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-2xl text-green-600">
                R$ {order?.transactions?.[0]?.totalAmount?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Método</span>
              <StatusBadge
                status={order?.transactions?.[0]?.paymentMethod as any}
                type="payment"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge
                status={order?.transactions?.[0]?.paymentStatus as any}
                type="payment"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating Section */}
      {order?.rating ? (
        <Card className="border-yellow-500/30 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>Avaliação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-6 h-6 ${star <= (order?.rating?.rating ?? 0)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-gray-500'
                    }`}
                />
              ))}
              <span className="font-medium text-lg">{order?.rating?.rating}/5</span>
            </div>
            {order?.rating?.comment && (
              <div>
                <p className="font-medium mb-1">Comentário</p>
                <p className="text-foreground/80">{order.rating.comment}</p>
              </div>
            )}
            <p className="text-sm text-foreground/60">
              Avaliado em {new Date(order?.rating?.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      ) : canRate && !showRatingForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Avalie o Entregador</CardTitle>
            <CardDescription>
              Sua opinião é importante para melhorar nosso serviço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowRatingForm(true)} className="w-full">
              <Star className="w-4 h-4" />
              Avaliar Entrega
            </Button>
          </CardContent>
        </Card>
      ) : canRate && showRatingForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Avaliar Entregador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nota (1-5)</Label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 cursor-pointer transition-colors ${star <= rating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                        }`}
                    />
                  </button>
                ))}
                <span className="font-medium ml-2">{rating}/5</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">Comentário (opcional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos sobre sua experiência..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSubmitRating}
                disabled={isSubmittingRating}
                className="flex-1"
              >
                {isSubmittingRating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Avaliação'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRatingForm(false)}
                disabled={isSubmittingRating}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Botão flutuante de Chat */}
      {order && order.status !== 'AWAITING_PAYMENT' && order.status !== 'CANCELLED' && !showChat && (
        <Button
          onClick={() => setShowChat(true)}
          className="fixed bottom-4 right-4 rounded-full w-14 h-14 bg-orange-500 hover:bg-orange-600 shadow-lg z-40"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Box */}
      {showChat && order && (
        <ChatBox
          orderId={order.id}
          onClose={() => setShowChat(false)}
          minimized={chatMinimized}
          onToggleMinimize={() => setChatMinimized(!chatMinimized)}
        />
      )}
    </div>
  );
}
