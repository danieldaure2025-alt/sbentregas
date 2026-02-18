'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckoutWrapper } from '@/components/checkout/checkout-wrapper';
import { CameraCapture } from '@/components/camera/camera-capture';
import { MapPin, Navigation, FileText, DollarSign, Loader2, CreditCard, ArrowRight, CheckCircle, ArrowLeft, Banknote, QrCode, Clock, Plus, Trash2, Calendar, Camera, ScanText } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';

type Step = 'details' | 'payment' | 'success';
type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'CASH' | 'END_OF_DAY';

interface LocationInput {
  id: string;
  address: string;
}

export default function NewOrderPage() {
  const [step, setStep] = useState<Step>('details');
  const [originAddresses, setOriginAddresses] = useState<LocationInput[]>([{ id: '1', address: '' }]);
  const [destinationAddresses, setDestinationAddresses] = useState<LocationInput[]>([{ id: '1', address: '' }]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [estimate, setEstimate] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [endOfDayBillingEnabled, setEndOfDayBillingEnabled] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Handle extracted info from camera/OCR
  const handleExtractedInfo = (info: {
    originAddress?: string;
    destinationAddress?: string;
    phone?: string;
    recipientName?: string;
    notes?: string;
  }) => {
    // Update origin address if found
    if (info.originAddress) {
      setOriginAddresses([{ id: '1', address: info.originAddress }]);
    }
    
    // Update destination address if found
    if (info.destinationAddress) {
      setDestinationAddresses([{ id: '1', address: info.destinationAddress }]);
    }
    
    // Build notes from extracted info
    const newNotes: string[] = [];
    if (info.recipientName) newNotes.push(`Destinatário: ${info.recipientName}`);
    if (info.phone) newNotes.push(`Telefone: ${info.phone}`);
    if (info.notes) newNotes.push(info.notes);
    
    if (newNotes.length > 0) {
      setNotes(prev => prev ? `${prev}\n${newNotes.join('\n')}` : newNotes.join('\n'));
    }
    
    // Clear estimate since addresses may have changed
    setEstimate(null);
    // Hide camera after extraction
    setShowCamera(false);
  };

  // Check if user has end of day billing enabled
  useEffect(() => {
    const checkEndOfDayBilling = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const session = await res.json();
          if (session?.user?.id) {
            const userRes = await fetch(`/api/users/${session.user.id}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              setEndOfDayBillingEnabled(userData.user?.endOfDayBilling ?? false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking end of day billing:', error);
      }
    };
    checkEndOfDayBilling();
  }, []);

  const addOriginAddress = () => {
    setOriginAddresses([...originAddresses, { id: Date.now().toString(), address: '' }]);
    setEstimate(null);
  };

  const removeOriginAddress = (id: string) => {
    if (originAddresses.length > 1) {
      setOriginAddresses(originAddresses.filter(a => a.id !== id));
      setEstimate(null);
    }
  };

  const updateOriginAddress = (id: string, address: string) => {
    setOriginAddresses(originAddresses.map(a => a.id === id ? { ...a, address } : a));
    setEstimate(null);
  };

  const addDestinationAddress = () => {
    setDestinationAddresses([...destinationAddresses, { id: Date.now().toString(), address: '' }]);
    setEstimate(null);
  };

  const removeDestinationAddress = (id: string) => {
    if (destinationAddresses.length > 1) {
      setDestinationAddresses(destinationAddresses.filter(a => a.id !== id));
      setEstimate(null);
    }
  };

  const updateDestinationAddress = (id: string, address: string) => {
    setDestinationAddresses(destinationAddresses.map(a => a.id === id ? { ...a, address } : a));
    setEstimate(null);
  };

  const getFullOriginAddress = () => originAddresses.map(a => a.address).filter(a => a.trim()).join(' | ');
  const getFullDestinationAddress = () => destinationAddresses.map(a => a.address).filter(a => a.trim()).join(' | ');

  const handleCalculatePrice = async () => {
    const validOrigins = originAddresses.filter(a => a.address.trim());
    const validDestinations = destinationAddresses.filter(a => a.address.trim());

    if (validOrigins.length === 0 || validDestinations.length === 0) {
      toast({
        title: 'Erro',
        description: 'Preencha pelo menos um endereço de origem e um de destino',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);
    try {
      // Calculate using the first origin and first destination for base price
      // For multiple stops, we calculate cumulative distance
      const res = await fetch('/api/calculate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAddress: validOrigins[0].address,
          destinationAddress: validDestinations[validDestinations.length - 1].address,
          additionalStops: validOrigins.length + validDestinations.length - 2,
        }),
      });

      if (!res.ok) {
        throw new Error('Erro ao calcular preço');
      }

      const data = await res.json();
      
      // Add extra fee for additional stops (R$3 per extra stop)
      const extraStops = (validOrigins.length - 1) + (validDestinations.length - 1);
      const extraFee = extraStops * 3;
      
      setEstimate({
        ...data,
        extraStops,
        extraFee,
        price: data.price + extraFee,
        totalStops: validOrigins.length + validDestinations.length,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao calcular preço',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!estimate) {
      toast({
        title: 'Erro',
        description: 'Calcule o preço antes de continuar',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originAddress: getFullOriginAddress(),
          destinationAddress: getFullDestinationAddress(),
          notes,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao criar pedido');
      }

      setOrder(data.order);
      
      if (paymentMethod === 'CASH') {
        setStep('success');
        toast({
          title: 'Pedido Criado!',
          description: 'Pagamento será realizado na entrega.',
        });
      } else if (paymentMethod === 'PIX') {
        setStep('success');
        toast({
          title: 'Pedido Criado!',
          description: 'Realize o pagamento PIX para liberar a coleta.',
        });
      } else {
        setStep('payment');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar pedido',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    toast({
      title: 'Pagamento Confirmado!',
      description: 'Seu pedido foi criado com sucesso.',
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: 'Erro no Pagamento',
      description: error,
      variant: 'destructive',
    });
  };

  // Success step
  if (step === 'success') {
    const getSuccessMessage = () => {
      switch (paymentMethod) {
        case 'PIX':
          return {
            title: 'Pedido Criado - Aguardando PIX',
            description: 'Realize o pagamento via PIX. Após a confirmação do recebimento, seu pedido será liberado para coleta.',
            icon: <QrCode className="w-10 h-10 text-blue-400" />,
            bgColor: 'bg-gray-800 border-blue-500/50',
            iconBg: 'bg-blue-500/20',
            textColor: 'text-blue-400',
            descColor: 'text-blue-300',
          };
        case 'CASH':
          return {
            title: 'Pedido Criado - Pagamento na Entrega',
            description: 'O pagamento será realizado em dinheiro no momento da entrega.',
            icon: <Banknote className="w-10 h-10 text-green-400" />,
            bgColor: 'bg-gray-800 border-green-500/50',
            iconBg: 'bg-green-500/20',
            textColor: 'text-green-400',
            descColor: 'text-green-300',
          };
        case 'END_OF_DAY':
          return {
            title: 'Pedido Criado - Cobrança no Final do Dia',
            description: 'Este pedido será cobrado junto com os demais ao final do expediente.',
            icon: <Calendar className="w-10 h-10 text-purple-400" />,
            bgColor: 'bg-gray-800 border-purple-500/50',
            iconBg: 'bg-purple-500/20',
            textColor: 'text-purple-400',
            descColor: 'text-purple-300',
          };
        default:
          return {
            title: 'Pedido Criado com Sucesso!',
            description: 'Seu pedido foi registrado e está aguardando um entregador.',
            icon: <CheckCircle className="w-10 h-10 text-green-400" />,
            bgColor: 'bg-gray-800 border-green-500/50',
            iconBg: 'bg-green-500/20',
            textColor: 'text-green-400',
            descColor: 'text-green-300',
          };
      }
    };

    const successInfo = getSuccessMessage();

    return (
      <div className="max-w-2xl mx-auto">
        <Card className={successInfo.bgColor}>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 ${successInfo.iconBg} rounded-full flex items-center justify-center mx-auto`}>
                {successInfo.icon}
              </div>
              <h2 className={`text-2xl font-bold ${successInfo.textColor}`}>{successInfo.title}</h2>
              <p className={successInfo.descColor}>
                {successInfo.description}
              </p>
              <p className="text-sm text-gray-400">
                Pedido #{order?.id?.slice(-8).toUpperCase()}
              </p>
              
              {paymentMethod === 'PIX' && (
                <div className="bg-gray-900 p-4 rounded-lg border border-blue-500/30 mt-4">
                  <p className="text-sm text-gray-400 mb-2">Chave PIX para pagamento:</p>
                  <p className="font-mono font-bold text-xl text-white">47 99292-5584</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Após o pagamento, entre em contato via WhatsApp para confirmação.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button onClick={() => router.push(`/dashboard/orders/${order?.id}`)} className="bg-orange-500 hover:bg-orange-600 text-white">
                  Ver Detalhes do Pedido
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/orders')} className="border-gray-600 text-white hover:bg-gray-700">
                  Ver Todos os Pedidos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment step
  if (step === 'payment' && order) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => setStep('details')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mb-2">Pagamento</h1>
          <p className="text-muted-foreground">Complete o pagamento para confirmar seu pedido</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-1 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Origem(s)</p>
                <p className="font-medium">{order.originAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Navigation className="w-4 h-4 mt-1 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Destino(s)</p>
                <p className="font-medium">{order.destinationAddress}</p>
              </div>
            </div>
            {order.notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 mt-1 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{order.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Dados do Pagamento
            </CardTitle>
            <CardDescription>Insira os dados do seu cartão para finalizar</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckoutWrapper
              orderId={order.id}
              amount={order.price}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Details step (default)
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Novo Pedido</h1>
        <p className="text-muted-foreground">Crie uma solicitação de coleta e entrega</p>
      </div>

      <div className="space-y-6">
        {/* Camera Capture Section */}
        {showCamera ? (
          <CameraCapture
            onExtract={handleExtractedInfo}
            onClose={() => setShowCamera(false)}
          />
        ) : (
          <Button
            type="button"
            onClick={() => setShowCamera(true)}
            className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
          >
            <Camera className="w-6 h-6 mr-3" />
            <div className="text-left">
              <div className="text-sm font-bold">Extrair da Foto</div>
              <div className="text-xs opacity-80">Tire foto para preencher automaticamente</div>
            </div>
            <ScanText className="w-5 h-5 ml-auto" />
          </Button>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Detalhes da Entrega</CardTitle>
            <CardDescription>Informe os endereços de origem e destino. Adicione múltiplas paradas se necessário.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Origin Addresses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  Endereço(s) de Coleta
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOriginAddress}
                  disabled={isCreatingOrder}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Coleta
                </Button>
              </div>
              
              {originAddresses.map((origin, index) => (
                <div key={origin.id} className="flex gap-2">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <Input
                      placeholder="Rua, número, bairro, cidade"
                      value={origin.address}
                      onChange={(e) => updateOriginAddress(origin.id, e.target.value)}
                      className="pl-12"
                      disabled={isCreatingOrder}
                    />
                  </div>
                  {originAddresses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOriginAddress(origin.id)}
                      disabled={isCreatingOrder}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Destination Addresses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-red-600" />
                  Endereço(s) de Entrega
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDestinationAddress}
                  disabled={isCreatingOrder}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Entrega
                </Button>
              </div>
              
              {destinationAddresses.map((dest, index) => (
                <div key={dest.id} className="flex gap-2">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                      {index + 1}
                    </div>
                    <Input
                      placeholder="Rua, número, bairro, cidade"
                      value={dest.address}
                      onChange={(e) => updateDestinationAddress(dest.id, e.target.value)}
                      className="pl-12"
                      disabled={isCreatingOrder}
                    />
                  </div>
                  {destinationAddresses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDestinationAddress(dest.id)}
                      disabled={isCreatingOrder}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="notes"
                  placeholder="Instruções especiais, ponto de referência, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="pl-10 min-h-[80px]"
                  disabled={isCreatingOrder}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCalculatePrice}
              variant="outline"
              className="w-full"
              disabled={isCalculating || isCreatingOrder}
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Calculando...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Calcular Preço
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {estimate && (
          <Card className="border-green-500/50 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span>Estimativa de Preço</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Distância:</span>
                <span className="font-medium text-white">{estimate?.distance} km</span>
              </div>
              {estimate?.duration && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Tempo estimado:</span>
                  <span className="font-medium text-white">{estimate?.duration} min</span>
                </div>
              )}
              {estimate?.totalStops > 2 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Paradas adicionais:</span>
                  <span className="font-medium text-white">{estimate?.extraStops} (+R$ {estimate?.extraFee?.toFixed(2)})</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Taxa de Entrega:</span>
                <span className="font-medium text-white">R$ {estimate?.deliveryFee?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Taxa da Plataforma:</span>
                <span className="font-medium text-white">R$ {estimate?.platformFee?.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-600 pt-3 flex justify-between items-center">
                <span className="font-semibold text-lg text-white">Total:</span>
                <span className="font-bold text-2xl text-green-500">
                  R$ {estimate?.price?.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {estimate && (
          <Card className="border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Forma de Pagamento</CardTitle>
              <CardDescription className="text-gray-400">Escolha como deseja pagar pela entrega</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {/* Cartão de Crédito */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT_CARD')}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'CREDIT_CARD' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${paymentMethod === 'CREDIT_CARD' ? 'text-orange-400' : 'text-white'}`}>Cartão de Crédito</p>
                    <p className="text-sm text-gray-400">Pagamento online seguro via Stripe</p>
                  </div>
                  {paymentMethod === 'CREDIT_CARD' && (
                    <CheckCircle className="w-6 h-6 text-orange-500" />
                  )}
                </button>

                {/* PIX */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'PIX'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'PIX' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${paymentMethod === 'PIX' ? 'text-blue-400' : 'text-white'}`}>PIX</p>
                    <p className="text-sm text-gray-400">Transferência instantânea</p>
                  </div>
                  {paymentMethod === 'PIX' && (
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  )}
                </button>

                {/* Dinheiro */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    paymentMethod === 'CASH' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${paymentMethod === 'CASH' ? 'text-green-400' : 'text-white'}`}>Dinheiro</p>
                    <p className="text-sm text-gray-400">Pagamento na entrega</p>
                  </div>
                  {paymentMethod === 'CASH' && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </button>

                {/* Cobrança no Final do Dia */}
                {endOfDayBillingEnabled && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('END_OF_DAY')}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'END_OF_DAY'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      paymentMethod === 'END_OF_DAY' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'
                    }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${paymentMethod === 'END_OF_DAY' ? 'text-purple-400' : 'text-white'}`}>Final do Dia</p>
                      <p className="text-sm text-gray-400">Cobrado ao final do expediente</p>
                    </div>
                    {paymentMethod === 'END_OF_DAY' && (
                      <CheckCircle className="w-6 h-6 text-purple-500" />
                    )}
                  </button>
                )}
              </div>

              {/* Info box baseado na seleção */}
              <div className={`p-4 rounded-lg border ${
                paymentMethod === 'CREDIT_CARD' 
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : paymentMethod === 'PIX'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : paymentMethod === 'END_OF_DAY'
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-green-500/10 border-green-500/30'
              }`}>
                {paymentMethod === 'CREDIT_CARD' && (
                  <p className="text-sm text-orange-300">
                    <strong className="text-orange-400">Pagamento Seguro:</strong> Você será redirecionado para a página de pagamento seguro via Stripe.
                  </p>
                )}
                {paymentMethod === 'PIX' && (
                  <p className="text-sm text-blue-300">
                    <strong className="text-blue-400">PIX:</strong> Após criar o pedido, você receberá a chave PIX para realizar a transferência. A coleta só será liberada após confirmarmos o recebimento do pagamento.
                  </p>
                )}
                {paymentMethod === 'CASH' && (
                  <p className="text-sm text-green-300">
                    <strong className="text-green-400">Dinheiro:</strong> O pagamento será realizado em espécie diretamente ao entregador no momento da entrega.
                  </p>
                )}
                {paymentMethod === 'END_OF_DAY' && (
                  <p className="text-sm text-purple-300">
                    <strong className="text-purple-400">Final do Dia:</strong> Este pedido será adicionado à sua conta e cobrado junto com os demais pedidos ao final do expediente.
                  </p>
                )}
              </div>

              <Button
                onClick={handleProceedToPayment}
                className="w-full h-12 text-lg bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isCreatingOrder}
              >
                {isCreatingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'CREDIT_CARD' && <CreditCard className="w-5 h-5 mr-2" />}
                    {paymentMethod === 'PIX' && <QrCode className="w-5 h-5 mr-2" />}
                    {paymentMethod === 'CASH' && <Banknote className="w-5 h-5 mr-2" />}
                    {paymentMethod === 'END_OF_DAY' && <Calendar className="w-5 h-5 mr-2" />}
                    {paymentMethod === 'CREDIT_CARD' ? 'Continuar para Pagamento' : 'Criar Pedido'}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
