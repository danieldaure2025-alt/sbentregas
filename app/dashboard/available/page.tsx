'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { 
  Power, PowerOff, MapPin, Navigation, DollarSign, Clock,
  AlertTriangle, Phone, User, Package, CheckCircle, XCircle,
  Play, Flag, Camera, Loader2, Volume2, Bell, Shield, BellRing,
  ExternalLink, Map
} from 'lucide-react';
import { 
  initializeUniversalPushNotifications,
  onUniversalForegroundMessage,
  isPushNotificationsAvailable,
  getNotificationPermissionStatus,
  isNativeApp,
} from '@/lib/native-notifications';
import { playNotificationSound } from '@/lib/firebase-client';

const TRACKING_INTERVAL = 3000; // 3 segundos
const STATUS_POLL_INTERVAL = 5000; // 5 segundos
const ALERT_INTERVAL = 2500; // 2.5 segundos entre alertas (mais insistente que iFood)
const ALERT_MAX_DURATION = 90000; // 90 segundos máximo de alertas (1.5 min)

type DeliveryStatus = 'OFFLINE' | 'ONLINE' | 'EM_ROTA_COLETA' | 'EM_ROTA_ENTREGA' | 'EM_EMERGENCIA';

interface PendingOffer {
  id: string;
  order: {
    id: string;
    originAddress: string;
    destinationAddress: string;
    price: number;
    distance: number;
    notes?: string;
    client: { name: string; phone?: string };
  };
  distanceToPickup: number;
  timeRemaining: number;
  expiresAt: string;
}

interface ActiveOrder {
  id: string;
  status: string;
  originAddress: string;
  originLatitude?: number;
  originLongitude?: number;
  destinationAddress: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  price: number;
  distance: number;
  notes?: string;
  client: { name: string; phone?: string };
}

interface DeliveryState {
  status: DeliveryStatus;
  location: { latitude?: number; longitude?: number; lastUpdate?: string };
  priorityScore: number;
  rejectionsToday: number;
  pendingOffer: PendingOffer | null;
  activeOrder: ActiveOrder | null;
}

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  OFFLINE: 'Offline',
  ONLINE: 'Online - Aguardando Pedidos',
  EM_ROTA_COLETA: 'Em Rota para Coleta',
  EM_ROTA_ENTREGA: 'Em Rota para Entrega',
  EM_EMERGENCIA: '⚠️ EMERGÊNCIA',
};

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  OFFLINE: 'bg-gray-500',
  ONLINE: 'bg-green-500',
  EM_ROTA_COLETA: 'bg-blue-500',
  EM_ROTA_ENTREGA: 'bg-purple-500',
  EM_EMERGENCIA: 'bg-red-500 animate-pulse',
};

export default function AvailableOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DeliveryState | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Array<{
    id: string;
    originAddress: string;
    destinationAddress: string;
    originLatitude?: number;
    originLongitude?: number;
    price: number;
    distance: number;
    notes?: string;
    createdAt: string;
    client: { id: string; name: string; phone?: string };
  }>>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [respondingOffer, setRespondingOffer] = useState(false);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [processingEvent, setProcessingEvent] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [offerCountdown, setOfferCountdown] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true); // Sempre ativo por padrão
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  
  const trackingRef = useRef<NodeJS.Timeout | null>(null);
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertStartTimeRef = useRef<number | null>(null);
  const currentOfferIdRef = useRef<string | null>(null);

  // Inicializar AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Tocar som de alerta MUITO INTENSO estilo iFood
  const playAlertSound = useCallback((urgent = false) => {
    if (!soundEnabled) return;
    
    try {
      const ctx = getAudioContext();
      
      if (urgent) {
        // SOM MUITO ALTO E INSISTENTE - Estilo iFood
        // Sequência de tons que simulam sirene/alarme
        const playTone = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'square'; // Som mais "agressivo"
          gain.gain.value = 1.0; // VOLUME MÁXIMO
          osc.start(ctx.currentTime + startTime);
          osc.stop(ctx.currentTime + startTime + duration);
        };
        
        // Padrão de sirene: TI-TI-TI-TIIIII (5x)
        for (let cycle = 0; cycle < 5; cycle++) {
          const baseTime = cycle * 0.6;
          // 3 beeps curtos
          playTone(1200, baseTime + 0.0, 0.08);
          playTone(1200, baseTime + 0.12, 0.08);
          playTone(1200, baseTime + 0.24, 0.08);
          // 1 beep longo
          playTone(1500, baseTime + 0.36, 0.2);
        }
        
        // Segunda onda - frequências alternadas (sirene)
        setTimeout(() => {
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = i % 2 === 0 ? 800 : 1200; // Alterna frequência
              osc.type = 'sawtooth';
              gain.gain.value = 1.0;
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.15);
            }, i * 180);
          }
        }, 3200);

        // VIBRAÇÃO MUITO INTENSA E PROLONGADA
        if ('vibrate' in navigator) {
          // Padrão: vibra-pausa-vibra-pausa... muito intenso
          navigator.vibrate([
            400, 100, 400, 100, 400, 100,  // Primeiro grupo
            600, 150,                       // Pausa maior
            400, 100, 400, 100, 400, 100,  // Segundo grupo
            600, 150,                       // Pausa maior  
            800, 200, 800                   // Final longo
          ]);
        }
      } else {
        // Som normal (não urgente)
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 660;
            osc.type = 'square';
            gain.gain.value = 0.9;
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
          }, i * 200);
        }

        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    } catch (e) {
      console.error('Erro ao tocar som:', e);
    }
  }, [soundEnabled, getAudioContext]);

  // Parar alertas repetidos
  const stopRepeatingAlerts = useCallback(() => {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
    alertStartTimeRef.current = null;
    currentOfferIdRef.current = null;
    console.log('🔕 Alertas repetidos parados');
  }, []);

  // Iniciar alertas repetidos estilo iFood
  const startRepeatingAlerts = useCallback((offerId: string, offerDetails: { price: number; originAddress: string; destinationAddress: string; distanceToPickup: number }) => {
    // Se já está alertando para esta oferta, não reinicia
    if (currentOfferIdRef.current === offerId && alertIntervalRef.current) {
      return;
    }
    
    // Parar alertas anteriores se houver
    stopRepeatingAlerts();
    
    currentOfferIdRef.current = offerId;
    alertStartTimeRef.current = Date.now();
    
    console.log('🔔 Iniciando alertas repetidos (estilo iFood) para oferta:', offerId);
    
    // Função de alerta
    const triggerAlert = () => {
      const elapsed = Date.now() - (alertStartTimeRef.current || 0);
      const remaining = Math.ceil((ALERT_MAX_DURATION - elapsed) / 1000);
      const alertNumber = Math.floor(elapsed / ALERT_INTERVAL) + 1;
      
      console.log(`🔔🔔🔔 ALERTA #${alertNumber} - Restam ${remaining}s`);
      
      // Tocar som urgente MUITO ALTO
      playAlertSound(true);
      
      // VIBRAÇÃO EXTREMAMENTE INTENSA - padrão longo
      if ('vibrate' in navigator) {
        // Vibra por quase todo o intervalo entre alertas
        navigator.vibrate([
          300, 50, 300, 50, 300, 50, 300, 50, // Rajada inicial
          500, 100,                            // Pausa curta
          600, 50, 600, 50, 600               // Vibração longa final
        ]);
      }
      
      // Mostrar notificação nativa atualizada com urgência
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const urgencyEmoji = remaining <= 30 ? '🚨🚨🚨' : (remaining <= 60 ? '🚨🚨' : '🚨');
          const notification = new Notification(`${urgencyEmoji} NOVO PEDIDO! (${remaining}s)`, {
            body: `💰 R$ ${offerDetails.price.toFixed(2)} - ${offerDetails.distanceToPickup.toFixed(1)}km até você\n\n📍 ${offerDetails.originAddress.split(',')[0]}\n🏁 ${offerDetails.destinationAddress.split(',')[0]}\n\n⚡⚡⚡ ACEITE AGORA! ⚡⚡⚡`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: 'order-alert',
            requireInteraction: true,
            silent: false,
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (e) {
          console.error('Erro na notificação:', e);
        }
      }
      
      // Toast visual também
      if (alertNumber % 3 === 0) {
        toast({
          title: `🚨 PEDIDO AGUARDANDO!`,
          description: `R$ ${offerDetails.price.toFixed(2)} - Aceite em ${remaining}s!`,
        });
      }
      
      // Verificar se passou o tempo máximo
      if (elapsed >= ALERT_MAX_DURATION) {
        console.log('⏱️ Tempo máximo atingido - parando alertas');
        stopRepeatingAlerts();
      }
    };
    
    // Primeiro alerta imediato
    triggerAlert();
    
    // Alertas a cada 3 segundos
    alertIntervalRef.current = setInterval(triggerAlert, ALERT_INTERVAL);
    
  }, [playAlertSound, stopRepeatingAlerts, toast]);

  // Ativar som automaticamente (chamado ao ficar online)
  const enableSoundAuto = useCallback(() => {
    try {
      getAudioContext();
      setSoundEnabled(true);
    } catch (e) {
      console.error('Erro ao ativar som:', e);
    }
  }, [getAudioContext]);

  // Inicializar notificações e som automaticamente
  const initializeNotificationsAuto = useCallback(async () => {
    if (notificationsInitialized) return;
    
    try {
      console.log('🔔 Iniciando configuração de notificações...');
      
      // Ativar som
      enableSoundAuto();
      console.log('✅ Som ativado');
      
      // Primeiro, tentar a API de Notification nativa (fallback simples)
      if ('Notification' in window) {
        console.log('📱 Solicitando permissão de notificações nativas...');
        const permission = await Notification.requestPermission();
        console.log('📱 Permissão de notificações:', permission);
        
        if (permission === 'granted') {
          setFcmEnabled(true);
          console.log('✅ Notificações nativas ativadas!');
          toast({
            title: '🔔 Notificações Ativas',
            description: 'Você receberá alertas de novos pedidos.',
          });
          
          // Tentar também registrar FCM (se disponível)
          try {
            if (isPushNotificationsAvailable()) {
              const result = await initializeUniversalPushNotifications();
              console.log('📱 FCM resultado:', result);
            }
          } catch (fcmError) {
            console.warn('⚠️ FCM não disponível, usando apenas notificações nativas:', fcmError);
          }
        } else {
          console.warn('⚠️ Permissão de notificações negada');
          toast({
            title: '⚠️ Notificações',
            description: 'Permita notificações nas configurações do navegador para receber alertas.',
            variant: 'destructive',
          });
        }
      } else {
        console.log('📱 Notificações não disponíveis neste navegador');
      }
      
      setNotificationsInitialized(true);
    } catch (e) {
      console.error('❌ Erro ao inicializar notificações:', e);
      toast({
        title: 'Erro',
        description: 'Falha ao configurar notificações.',
        variant: 'destructive',
      });
    }
  }, [notificationsInitialized, enableSoundAuto, toast]);

  // Verificar status das notificações push e inicializar automaticamente
  useEffect(() => {
    const checkAndInitNotifications = async () => {
      if (!isPushNotificationsAvailable()) return;
      
      // Se o usuário já está online, SEMPRE tentar inicializar notificações
      // Isso garante que o token FCM seja registrado no servidor
      if (state && state.status !== 'OFFLINE' && !notificationsInitialized) {
        console.log('Inicializando notificações automaticamente (entregador online)...');
        await initializeNotificationsAuto();
      } else if (!state || state.status === 'OFFLINE') {
        // Apenas verificar status da permissão quando offline
        const permission = await getNotificationPermissionStatus();
        if (permission === 'granted') {
          setFcmEnabled(true);
        }
      }
    };
    checkAndInitNotifications();
  }, [state, notificationsInitialized, initializeNotificationsAuto]);

  // Solicitar Wake Lock (manter tela ligada)
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      console.error('Wake Lock não disponível:', e);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Calcular distância em km entre duas coordenadas (Haversine)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Buscar pedidos disponíveis
  const fetchAvailableOrders = useCallback(async () => {
    try {
      // Buscar posição atual do entregador
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000,
          });
        });
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch (e) {
        console.log('Não foi possível obter localização atual');
      }

      const res = await fetch('/api/orders/available');
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data.orders || []);
        console.log(`📦 ${data.orders?.length || 0} pedidos disponíveis`);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos disponíveis:', error);
    }
  }, []);

  // Buscar status atual
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery-person/status');
      if (!res.ok) throw new Error('Erro ao buscar status');
      const data = await res.json();
      
      // Verificar se há nova oferta
      if (data.pendingOffer && (!state?.pendingOffer || state.pendingOffer.id !== data.pendingOffer.id)) {
        console.log('🚀 NOVO PEDIDO DETECTADO!', data.pendingOffer.id);
        
        // Iniciar alertas repetidos estilo iFood (a cada 3s por 60s)
        startRepeatingAlerts(data.pendingOffer.id, {
          price: data.pendingOffer.order.price,
          originAddress: data.pendingOffer.order.originAddress,
          destinationAddress: data.pendingOffer.order.destinationAddress,
          distanceToPickup: data.pendingOffer.distanceToPickup,
        });
        
        // Toast visual no app
        toast({
          title: '🚀 NOVO PEDIDO!',
          description: `R$ ${data.pendingOffer.order.price.toFixed(2)} - Aceite em até 60 segundos!`,
        });
      }
      
      // Se não há mais oferta pendente, parar alertas
      if (!data.pendingOffer && currentOfferIdRef.current) {
        console.log('📭 Oferta removida - parando alertas');
        stopRepeatingAlerts();
      }
      
      setState(data);
      
      // Atualizar countdown da oferta
      if (data.pendingOffer?.timeRemaining) {
        setOfferCountdown(data.pendingOffer.timeRemaining);
      }
      
      // Buscar pedidos disponíveis quando online
      if (data.status === 'ONLINE') {
        await fetchAvailableOrders();
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    } finally {
      setLoading(false);
    }
  }, [state?.pendingOffer, startRepeatingAlerts, stopRepeatingAlerts, toast, fetchAvailableOrders]);

  // Abrir navegação para o destino
  const openNavigation = useCallback((latitude?: number, longitude?: number, address?: string) => {
    if (!latitude || !longitude) {
      // Se não tiver coordenadas, usa o endereço
      if (address) {
        const encodedAddress = encodeURIComponent(address);
        // Abre Google Maps com endereço
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
      } else {
        toast({
          title: 'Erro',
          description: 'Coordenadas não disponíveis',
          variant: 'destructive',
        });
      }
      return;
    }

    // Detectar se é iOS ou Android
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      // iOS - abre Apple Maps por padrão, mas oferece escolha
      // Usando geo: scheme que abre seletor de apps
      window.location.href = `maps://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
    } else if (isAndroid) {
      // Android - abre seletor de apps de navegação
      window.location.href = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
      
      // Fallback para Google Maps se geo: não funcionar
      setTimeout(() => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`, '_blank');
      }, 500);
    } else {
      // Desktop/outros - abre Google Maps
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`, '_blank');
    }
  }, [toast]);

  // Aceitar pedido diretamente da lista
  const acceptOrderDirectly = useCallback(async (orderId: string) => {
    setAcceptingOrderId(orderId);
    
    try {
      // Parar alertas se houver
      stopRepeatingAlerts();
      
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao aceitar pedido');
      }

      toast({
        title: '✅ Pedido Aceito!',
        description: 'Abrindo navegação para coleta...',
      });

      // Atualizar status e lista
      await fetchStatus();
      
      // Abrir navegação automaticamente para o local de coleta
      if (data.order) {
        setTimeout(() => {
          openNavigation(
            data.order.originLatitude,
            data.order.originLongitude,
            data.order.originAddress
          );
        }, 500);
      }
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: (error as Error).message,
        variant: 'destructive',
      });
      // Recarregar lista de pedidos
      await fetchAvailableOrders();
    } finally {
      setAcceptingOrderId(null);
    }
  }, [toast, stopRepeatingAlerts, fetchStatus, fetchAvailableOrders, openNavigation]);

  // Enviar localização
  const sendLocation = useCallback(async () => {
    if (!state || state.status === 'OFFLINE') return;
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        });
      });

      await fetch('/api/delivery-person/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar localização:', error);
    }
  }, [state]);

  // Alternar status online/offline
  const toggleOnlineStatus = useCallback(async () => {
    if (!state) return;
    
    setTogglingStatus(true);
    
    try {
      let latitude, longitude;
      
      // Obter localização atual
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (e) {
        if (state.status === 'OFFLINE') {
          toast({ title: 'Erro', description: 'Ative a localização para ficar online.', variant: 'destructive' });
          setTogglingStatus(false);
          return;
        }
      }

      const newStatus = state.status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';

      const res = await fetch('/api/delivery-person/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, latitude, longitude }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao alterar status');
      }

      if (newStatus === 'ONLINE') {
        await requestWakeLock();
        // Inicializar notificações automaticamente ao ficar online
        await initializeNotificationsAuto();
        toast({ title: '✅ Online!', description: 'Notificações e alertas sonoros ativados automaticamente.' });
      } else {
        releaseWakeLock();
        toast({ title: 'Offline', description: 'Você não receberá mais pedidos.' });
      }

      await fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setTogglingStatus(false);
    }
  }, [state, toast, fetchStatus, requestWakeLock, releaseWakeLock]);

  // Responder oferta (aceitar/rejeitar)
  const respondToOffer = useCallback(async (accept: boolean) => {
    if (!state?.pendingOffer) return;
    
    // Parar alertas imediatamente ao responder
    stopRepeatingAlerts();
    
    setRespondingOffer(true);
    
    try {
      let latitude, longitude;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (e) {
        console.error('Erro ao obter localização:', e);
      }

      const res = await fetch('/api/orders/offer/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: state.pendingOffer.id,
          accept,
          latitude,
          longitude,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao responder');
      }

      if (accept) {
        toast({ title: '✅ Pedido Aceito!', description: 'Abrindo navegação para coleta...' });
        
        // Abrir navegação automaticamente para o local de coleta
        // Primeiro busca os dados atualizados do pedido
        const statusRes = await fetch('/api/delivery-person/status');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.activeOrder) {
            // Pequeno delay para garantir que a UI atualize
            setTimeout(() => {
              openNavigation(
                statusData.activeOrder.originLatitude,
                statusData.activeOrder.originLongitude,
                statusData.activeOrder.originAddress
              );
            }, 500);
          }
        }
      } else {
        toast({ title: 'Pedido Rejeitado', description: data.message });
        if (data.paused) {
          toast({ title: '⚠️ Pausado', description: 'Muitas rejeições hoje.', variant: 'destructive' });
        }
      }

      await fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setRespondingOffer(false);
    }
  }, [state?.pendingOffer, toast, fetchStatus, stopRepeatingAlerts, openNavigation]);

  // Registrar evento de entrega
  const registerDeliveryEvent = useCallback(async (eventType: string) => {
    setProcessingEvent(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const res = await fetch('/api/delivery-person/delivery-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar evento');
      }

      if (data.warning) {
        toast({ title: '⚠️ Aviso', description: data.warning, variant: 'destructive' });
      } else {
        const messages: Record<string, string> = {
          CHEGADA_COLETA: 'Chegada na coleta registrada!',
          SAIDA_COLETA: 'Saída para entrega registrada!',
          CHEGADA_ENTREGA: 'Chegada na entrega registrada!',
          ENTREGA_FINALIZADA: '🎉 Entrega finalizada com sucesso!',
        };
        toast({ title: '✅ Sucesso', description: messages[eventType] || 'Evento registrado.' });
      }

      await fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setProcessingEvent(false);
    }
  }, [toast, fetchStatus]);

  // Botão de Pânico
  const triggerPanic = useCallback(async () => {
    setPanicMode(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const res = await fetch('/api/delivery-person/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          reason: 'Botão de pânico acionado pelo entregador',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao acionar emergência');
      }

      toast({ title: '🚨 EMERGÊNCIA ACIONADA', description: 'Administradores foram notificados!', variant: 'destructive' });
      await fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setPanicMode(false);
    }
  }, [toast, fetchStatus]);

  // Cancelar emergência
  const cancelPanic = useCallback(async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const res = await fetch('/api/delivery-person/emergency', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro');
      }

      toast({ title: 'Emergência cancelada', description: 'Você voltou ao status normal.' });
      await fetchStatus();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    }
  }, [toast, fetchStatus]);

  // Efeitos
  useEffect(() => {
    fetchStatus();
    
    // Ativar notificações push automaticamente (estilo iFood/APK nativo)
    const autoEnableNotifications = async () => {
      if (!isPushNotificationsAvailable()) return;
      
      try {
        const { success, isNative } = await initializeUniversalPushNotifications();
        if (success) {
          setFcmEnabled(true);
          console.log(`Notificações ativadas automaticamente (${isNative ? 'Nativo' : 'Web'})`);
        }
      } catch (e) {
        console.error('Erro ao ativar notificações automaticamente:', e);
      }
    };
    
    autoEnableNotifications();

    return () => {
      if (trackingRef.current) clearInterval(trackingRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
      releaseWakeLock();
    };
  }, [fetchStatus, releaseWakeLock]);

  // Listener para mensagens push em foreground (Universal - Native/Web)
  useEffect(() => {
    if (!fcmEnabled) return;
    
    // Em apps nativos, o listener é gerenciado pela lib nativa
    if (isNativeApp()) return;

    const unsubscribe = onUniversalForegroundMessage((payload) => {
      console.log('Mensagem push recebida em foreground:', payload);
      
      // Tocar som e vibrar
      playAlertSound(true);
      playNotificationSound(); // Som extra da buzina
      
      // Mostrar toast
      toast({
        title: payload.notification?.title || '🚀 Novo Pedido!',
        description: payload.notification?.body || 'Você tem um novo pedido disponível',
      });
      
      // Atualizar status para buscar novo pedido
      fetchStatus();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fcmEnabled, playAlertSound, toast, fetchStatus]);

  // Iniciar/parar rastreamento baseado no status
  useEffect(() => {
    if (trackingRef.current) {
      clearInterval(trackingRef.current);
      trackingRef.current = null;
    }
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }

    if (state && state.status !== 'OFFLINE') {
      // Rastreamento a cada 3 segundos
      trackingRef.current = setInterval(sendLocation, TRACKING_INTERVAL);
      // Poll de status a cada 5 segundos
      statusPollRef.current = setInterval(fetchStatus, STATUS_POLL_INTERVAL);
    }

    return () => {
      if (trackingRef.current) clearInterval(trackingRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [state?.status, sendLocation, fetchStatus]);

  // Countdown da oferta
  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (state?.pendingOffer && offerCountdown > 0) {
      countdownRef.current = setInterval(() => {
        setOfferCountdown((prev) => {
          if (prev <= 1) {
            fetchStatus(); // Recarregar quando expirar
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [state?.pendingOffer, offerCountdown, fetchStatus]);

  if (loading) {
    return <Loading />;
  }

  if (!state) {
    return (
      <div className="p-4 text-center text-red-500">
        Erro ao carregar dados. Recarregue a página.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-32">
      {/* Header com Status */}
      <Card className={`${STATUS_COLORS[state.status]} text-white`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Status Atual</p>
              <p className="text-xl font-bold">{STATUS_LABELS[state.status]}</p>
            </div>
            <div className="text-right text-sm">
              <p>Score: {state.priorityScore}</p>
              <p>Rejeições hoje: {state.rejectionsToday}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de status de notificações (automático) */}
      {state.status !== 'OFFLINE' && (
        <div className="flex items-center justify-center gap-3 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-sm">Som Ativo</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-2">
            <BellRing className={`w-5 h-5 ${fcmEnabled ? 'text-green-400' : 'text-yellow-400'}`} />
            <span className={`text-sm ${fcmEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
              {fcmEnabled ? 'Notificações Push Ativas' : 'Ativando notificações...'}
            </span>
          </div>
        </div>
      )}

      {/* Botão Online/Offline */}
      {state.status === 'OFFLINE' || state.status === 'ONLINE' ? (
        <Button
          onClick={toggleOnlineStatus}
          disabled={togglingStatus}
          className={`w-full py-8 text-xl ${
            state.status === 'OFFLINE'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          {togglingStatus ? (
            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          ) : state.status === 'OFFLINE' ? (
            <Power className="w-6 h-6 mr-2" />
          ) : (
            <PowerOff className="w-6 h-6 mr-2" />
          )}
          {state.status === 'OFFLINE' ? 'FICAR ONLINE' : 'FICAR OFFLINE'}
        </Button>
      ) : null}

      {/* Modal de Oferta de Pedido com Timer de 60s */}
      {state.pendingOffer && (
        <Card className="border-2 border-orange-500 bg-gradient-to-b from-orange-500/20 to-transparent overflow-hidden">
          {/* Barra de progresso do timer */}
          <div className="h-2 bg-gray-700 relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(offerCountdown / 60) * 100}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
          
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center text-orange-400 animate-bounce">
                <BellRing className="w-6 h-6 mr-2" />
                🚨 NOVO PEDIDO!
              </span>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className={`text-3xl font-mono font-bold px-4 py-2 rounded-lg ${
                  offerCountdown <= 10 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : offerCountdown <= 30 
                      ? 'bg-yellow-500 text-black' 
                      : 'bg-green-600 text-white'
                }`}>
                  {offerCountdown}s
                </span>
              </div>
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Aceite em até 60 segundos ou a oferta será enviada para outro entregador
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-card p-3 rounded-lg space-y-2">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Coleta</p>
                  <p className="text-sm">{state.pendingOffer.order.originAddress}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Flag className="w-4 h-4 text-red-500 mr-2 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Entrega</p>
                  <p className="text-sm">{state.pendingOffer.order.destinationAddress}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card p-2 rounded">
                <p className="text-xs text-gray-400">Distância até você</p>
                <p className="text-lg font-bold text-blue-400">
                  {state.pendingOffer.distanceToPickup.toFixed(1)} km
                </p>
              </div>
              <div className="bg-card p-2 rounded">
                <p className="text-xs text-gray-400">Rota total</p>
                <p className="text-lg font-bold">
                  {state.pendingOffer.order.distance.toFixed(1)} km
                </p>
              </div>
              <div className="bg-card p-2 rounded">
                <p className="text-xs text-gray-400">Valor</p>
                <p className="text-lg font-bold text-green-400">
                  R$ {state.pendingOffer.order.price.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-2 text-gray-400" />
              <span>{state.pendingOffer.order.client.name}</span>
              {state.pendingOffer.order.client.phone && (
                <a href={`tel:${state.pendingOffer.order.client.phone}`} className="ml-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                </a>
              )}
            </div>

            {state.pendingOffer.order.notes && (
              <p className="text-xs text-gray-400 bg-card p-2 rounded">
                Obs: {state.pendingOffer.order.notes}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => respondToOffer(false)}
                disabled={respondingOffer}
                variant="outline"
                className="flex-1 border-red-500 text-red-500 hover:bg-red-500/20"
              >
                <XCircle className="w-5 h-5 mr-1" />
                Rejeitar
              </Button>
              <Button
                onClick={() => respondToOffer(true)}
                disabled={respondingOffer}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
              >
                {respondingOffer ? (
                  <Loader2 className="w-5 h-5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-1" />
                )}
                ACEITAR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pedido Ativo */}
      {state.activeOrder && (
        <Card className="border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-blue-400">
              <Navigation className="w-5 h-5 mr-2" />
              Pedido em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-card p-3 rounded-lg space-y-3">
              {/* Coleta */}
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <MapPin className={`w-4 h-4 mr-2 mt-1 flex-shrink-0 ${
                    state.status === 'EM_ROTA_COLETA' ? 'text-green-500 animate-pulse' : 'text-gray-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Coleta</p>
                    <p className="text-sm">{state.activeOrder.originAddress}</p>
                  </div>
                </div>
                {state.status === 'EM_ROTA_COLETA' && (
                  <Button
                    onClick={() => openNavigation(
                      state.activeOrder?.originLatitude,
                      state.activeOrder?.originLongitude,
                      state.activeOrder?.originAddress
                    )}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 ml-2"
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    IR
                  </Button>
                )}
              </div>
              
              {/* Entrega */}
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <Flag className={`w-4 h-4 mr-2 mt-1 flex-shrink-0 ${
                    state.status === 'EM_ROTA_ENTREGA' ? 'text-red-500 animate-pulse' : 'text-gray-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Entrega</p>
                    <p className="text-sm">{state.activeOrder.destinationAddress}</p>
                  </div>
                </div>
                {state.status === 'EM_ROTA_ENTREGA' && (
                  <Button
                    onClick={() => openNavigation(
                      state.activeOrder?.destinationLatitude,
                      state.activeOrder?.destinationLongitude,
                      state.activeOrder?.destinationAddress
                    )}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 ml-2"
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    IR
                  </Button>
                )}
              </div>
            </div>

            {/* Botão grande de navegação */}
            {state.status === 'EM_ROTA_COLETA' && (
              <Button
                onClick={() => openNavigation(
                  state.activeOrder?.originLatitude,
                  state.activeOrder?.originLongitude,
                  state.activeOrder?.originAddress
                )}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 py-5 text-lg font-bold"
              >
                <Map className="w-6 h-6 mr-2" />
                🗺️ ABRIR NAVEGAÇÃO PARA COLETA
              </Button>
            )}

            {state.status === 'EM_ROTA_ENTREGA' && (
              <Button
                onClick={() => openNavigation(
                  state.activeOrder?.destinationLatitude,
                  state.activeOrder?.destinationLongitude,
                  state.activeOrder?.destinationAddress
                )}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 py-5 text-lg font-bold"
              >
                <Map className="w-6 h-6 mr-2" />
                🗺️ ABRIR NAVEGAÇÃO PARA ENTREGA
              </Button>
            )}

            <div className="flex items-center justify-between bg-card p-3 rounded">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <span>{state.activeOrder.client.name}</span>
              </div>
              {state.activeOrder.client.phone && (
                <a 
                  href={`tel:${state.activeOrder.client.phone}`}
                  className="bg-blue-600 p-2 rounded-full"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Valor da entrega:</span>
              <span className="text-xl font-bold text-green-400">
                R$ {state.activeOrder.price.toFixed(2)}
              </span>
            </div>

            {/* Botões de Ação baseados no status */}
            <div className="space-y-2">
              {state.status === 'EM_ROTA_COLETA' && (
                <>
                  <Button
                    onClick={() => registerDeliveryEvent('CHEGADA_COLETA')}
                    disabled={processingEvent}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-6"
                  >
                    {processingEvent ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <MapPin className="w-5 h-5 mr-2" />}
                    CHEGUEI NA COLETA
                  </Button>
                  <Button
                    onClick={() => registerDeliveryEvent('SAIDA_COLETA')}
                    disabled={processingEvent}
                    className="w-full bg-purple-600 hover:bg-purple-700 py-6"
                  >
                    {processingEvent ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                    COLETEI - INICIAR ENTREGA
                  </Button>
                </>
              )}

              {state.status === 'EM_ROTA_ENTREGA' && (
                <>
                  <Button
                    onClick={() => registerDeliveryEvent('CHEGADA_ENTREGA')}
                    disabled={processingEvent}
                    className="w-full bg-orange-600 hover:bg-orange-700 py-6"
                  >
                    {processingEvent ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Flag className="w-5 h-5 mr-2" />}
                    CHEGUEI NA ENTREGA
                  </Button>
                  <Button
                    onClick={() => registerDeliveryEvent('ENTREGA_FINALIZADA')}
                    disabled={processingEvent}
                    className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
                  >
                    {processingEvent ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                    ✅ FINALIZAR ENTREGA
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status ONLINE - mostrar pedidos disponíveis */}
      {state.status === 'ONLINE' && !state.pendingOffer && !state.activeOrder && (
        <div className="space-y-4">
          {/* Header com status */}
          <Card className="border-green-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                  <Clock className="w-5 h-5 text-green-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-400">Você está Online</h3>
                  <p className="text-xs text-gray-500">GPS ativo • Rastreamento a cada 3s</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-orange-400">{availableOrders.length}</p>
                <p className="text-xs text-gray-400">pedidos</p>
              </div>
            </CardContent>
          </Card>

          {/* Lista de pedidos disponíveis */}
          {availableOrders.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-400 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                PEDIDOS DISPONÍVEIS NA REGIÃO
              </h4>
              {availableOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className="border-blue-500/30 bg-gradient-to-r from-blue-900/20 to-transparent hover:border-blue-400/50 transition-all"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xl font-bold text-green-400">
                        R$ {order.price.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Coleta</p>
                          <p className="text-gray-300">{order.originAddress.split(',').slice(0, 2).join(',')}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Flag className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Entrega</p>
                          <p className="text-gray-300">{order.destinationAddress.split(',').slice(0, 2).join(',')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Distâncias */}
                    <div className="flex items-center justify-between text-xs bg-card/30 p-2 rounded">
                      {/* Distância até a coleta */}
                      <div className="flex items-center">
                        {currentPosition && order.originLatitude && order.originLongitude ? (
                          <div className="flex items-center text-yellow-400 font-medium">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>
                              {calculateDistance(
                                currentPosition.lat,
                                currentPosition.lng,
                                order.originLatitude,
                                order.originLongitude
                              ).toFixed(1)} km até você
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span>-- km até você</span>
                          </div>
                        )}
                      </div>
                      {/* Distância da entrega */}
                      <div className="flex items-center text-gray-400">
                        <Navigation className="w-3 h-3 mr-1" />
                        {order.distance.toFixed(1)} km entrega
                      </div>
                    </div>
                    
                    {/* Cliente */}
                    <div className="flex items-center text-xs text-gray-400">
                      <User className="w-3 h-3 mr-1" />
                      {order.client.name}
                    </div>

                    {order.notes && (
                      <p className="text-xs text-gray-500 bg-card/50 p-2 rounded">
                        📝 {order.notes}
                      </p>
                    )}

                    {/* Botão Aceitar */}
                    <Button
                      onClick={() => acceptOrderDirectly(order.id)}
                      disabled={acceptingOrderId === order.id}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3"
                    >
                      {acceptingOrderId === order.id ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Aceitando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          ACEITAR PEDIDO
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              <p className="text-center text-xs text-gray-500 py-2">
                💡 Os pedidos serão oferecidos automaticamente baseado na sua proximidade
              </p>
            </div>
          ) : (
            <Card className="border-dashed border-gray-600">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">Nenhum pedido disponível no momento</p>
                <p className="text-xs text-gray-500 mt-2">Novos pedidos aparecerão aqui automaticamente</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Botão de Pânico - sempre visível quando não offline */}
      {state.status !== 'OFFLINE' && (
        <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto">
          {state.status === 'EM_EMERGENCIA' ? (
            <Button
              onClick={cancelPanic}
              className="w-full bg-gray-600 hover:bg-gray-700 py-6"
            >
              <Shield className="w-5 h-5 mr-2" />
              CANCELAR EMERGÊNCIA
            </Button>
          ) : (
            <Button
              onClick={triggerPanic}
              disabled={panicMode}
              className="w-full bg-red-600 hover:bg-red-700 py-6 text-lg"
            >
              {panicMode ? (
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-6 h-6 mr-2" />
              )}
              🚨 BOTÃO DE PÂNICO
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
