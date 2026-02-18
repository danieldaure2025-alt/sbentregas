'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { StatusBadge } from '@/components/shared/status-badge';
import { DeliveryMap } from '@/components/maps/delivery-map';
import { useToast } from '@/hooks/use-toast';
import { useLocationTracker } from '@/hooks/use-location-tracker';
import {
  MapPin,
  Navigation,
  User,
  Phone,
  Clock,
  Package,
  TruckIcon,
  CheckCircle,
  Loader2,
  MapPinned,
  Wifi,
  WifiOff,
  DollarSign,
  Banknote,
  MessageCircle,
} from 'lucide-react';
import { ChatBox } from '@/components/chat/chat-box';

interface Order {
  id: string;
  originAddress: string;
  destinationAddress: string;
  notes?: string;
  status: string;
  price: number;
  distance: number;
  paymentMethod?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  inTransitAt?: string;
  completedAt?: string;
  client: { name: string; email: string; phone?: string };
  transactions: Array<{
    deliveryFee: number;
    totalAmount: number;
    paymentStatus: string;
  }>;
}

export default function DeliveryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMinimized, setChatMinimized] = useState(false);

  const orderId = params?.id as string;
  
  // Track location while on active delivery
  const isActiveDelivery = order?.status && ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'].includes(order.status);
  const { latitude, longitude, error: locationError, loading: locationLoading } = useLocationTracker(!!isActiveDelivery);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
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
        router.push('/dashboard/my-deliveries');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao atualizar status');
      }

      toast({
        title: 'Sucesso!',
        description: 'Status atualizado com sucesso',
      });

      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirmingPayment(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao confirmar pagamento');
      }

      toast({
        title: 'Pagamento Confirmado!',
        description: 'Dinheiro recebido e confirmado.',
      });

      // Refresh order data
      fetchOrder();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao confirmar pagamento',
        variant: 'destructive',
      });
    } finally {
      setConfirmingPayment(false);
    }
  };

  const getNextStatusButton = () => {
    if (!order) return null;

    const statusActions: Record<string, { status: string; label: string; icon: any }> = {
      ACCEPTED: {
        status: 'PICKED_UP',
        label: 'Marcar como Coletado',
        icon: Package,
      },
      PICKED_UP: {
        status: 'IN_TRANSIT',
        label: 'Iniciar Transporte',
        icon: TruckIcon,
      },
      IN_TRANSIT: {
        status: 'DELIVERED',
        label: 'Confirmar Entrega',
        icon: CheckCircle,
      },
    };

    const action = statusActions[order.status];
    if (!action) return null;

    const Icon = action.icon;

    return (
      <Button
        onClick={() => handleUpdateStatus(action.status)}
        disabled={updatingStatus}
        size="lg"
        className="w-full"
      >
        {updatingStatus ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Atualizando...
          </>
        ) : (
          <>
            <Icon className="w-5 h-5" />
            {action.label}
          </>
        )}
      </Button>
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!order) {
    return <div>Pedido não encontrado</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Detalhes da Entrega</h1>
          <p className="text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={order.status as any} type="order" />
      </div>

      {/* Action Button */}
      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">{getNextStatusButton()}</CardContent>
        </Card>
      )}

      {/* Cash Payment Confirmation for Delivery Person */}
      {isActiveDelivery && 
       order.paymentMethod === 'CASH' && 
       order?.transactions?.[0]?.paymentStatus === 'PENDING' && (
        <Card className="border-green-500/50 bg-green-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Banknote className="w-5 h-5" />
              Pagamento em Dinheiro
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Confirme o recebimento do pagamento do cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between mb-2">
                  <span className="text-foreground/70">Valor a Receber</span>
                  <span className="font-bold text-2xl text-green-400">R$ {order.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground/60">Status do Pagamento</span>
                  <span className="text-yellow-400">Aguardando</span>
                </div>
              </div>
              <Button 
                onClick={handleConfirmPayment}
                disabled={confirmingPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {confirmingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Confirmar Recebimento em Dinheiro
                  </>
                )}
              </Button>
              <p className="text-xs text-foreground/50 text-center">
                Confirme após receber o dinheiro do cliente na coleta ou entrega
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Tracking Status */}
      {isActiveDelivery && (
        <Card className={`${latitude && longitude ? 'border-green-500/50 bg-green-900/10' : 'border-yellow-500/50 bg-yellow-900/10'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {latitude && longitude ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Wifi className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-green-400">Localização Ativa</p>
                      <p className="text-xs text-foreground/60">Cliente pode rastrear sua posição</p>
                    </div>
                  </>
                ) : locationError ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <WifiOff className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium text-red-400">Localização Indisponível</p>
                      <p className="text-xs text-foreground/60">{locationError}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <MapPinned className="h-5 w-5 text-yellow-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-medium text-yellow-400">Obtendo localização...</p>
                      <p className="text-xs text-foreground/60">Aguarde</p>
                    </div>
                  </>
                )}
              </div>
              {latitude && longitude && (
                <div className="text-right text-xs text-foreground/60">
                  <p>{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle>Seus Ganhos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mb-1">Você recebe</p>
              <p className="font-bold text-3xl text-green-600">
                R$ {order?.transactions?.[0]?.deliveryFee?.toFixed(2) ?? '0.00'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total do pedido</p>
              <p className="font-medium text-lg">
                R$ {order?.transactions?.[0]?.totalAmount?.toFixed(2) ?? '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="pt-2 border-t">
            <p className="font-medium mb-1">Distância</p>
            <p className="text-muted-foreground">{order.distance} km</p>
          </div>
          {order?.notes && (
            <div className="pt-2 border-t">
              <p className="font-medium mb-1">Observações do Cliente</p>
              <p className="text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
          />
          
          {/* Botões de Navegação - Google Maps e Waze */}
          <div className="flex gap-3 mt-4">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const destination = encodeURIComponent(order.destinationAddress);
                const origin = encodeURIComponent(order.originAddress);
                window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`, '_blank');
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Google Maps
            </Button>
            <Button
              className="flex-1 bg-[#33ccff] hover:bg-[#00b3e6] text-black"
              onClick={() => {
                const destination = encodeURIComponent(order.destinationAddress);
                window.open(`https://waze.com/ul?q=${destination}&navigate=yes`, '_blank');
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Waze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Client Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Informações do Cliente</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{order?.client?.name}</p>
          <p className="text-sm text-muted-foreground">{order?.client?.email}</p>
          {order?.client?.phone && (
            <div className="flex items-center space-x-2 pt-2">
              <Phone className="w-4 h-4" />
              <a
                href={`tel:${order.client.phone}`}
                className="text-blue-600 hover:underline"
              >
                {order.client.phone}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Linha do Tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order?.acceptedAt && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Pedido Aceito</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.acceptedAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
            {order?.pickedUpAt && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
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
                  <TruckIcon className="w-5 h-5 text-purple-600" />
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

      {/* Botão flutuante de Chat */}
      {order && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && !showChat && (
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
