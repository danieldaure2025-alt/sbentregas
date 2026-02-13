'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, CheckCircle, Clock, MapPin, Phone, User,
  RefreshCw, Loader2, Volume2, Shield, Bell
} from 'lucide-react';

interface EmergencyAlert {
  id: string;
  userId: string;
  reason: string | null;
  latitude: number;
  longitude: number;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string;
    activeOrderId: string | null;
    currentLatitude: number | null;
    currentLongitude: number | null;
    deliveryStatus: string;
  };
}

export default function EmergenciesPage() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const prevUnresolvedRef = useRef(0);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const ctx = getAudioContext();
      
      // Som de sirene
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = i % 2 === 0 ? 800 : 600;
          osc.type = 'sawtooth';
          gain.gain.value = 0.5;
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        }, i * 350);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    } catch (e) {
      console.error('Erro ao tocar som:', e);
    }
  }, [soundEnabled, getAudioContext]);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (!showResolved) {
        params.set('resolved', 'false');
      }

      const res = await fetch(`/api/admin/emergencies?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar emergências');
      
      const data = await res.json();
      setAlerts(data.alerts);
      setUnresolvedCount(data.unresolvedCount);

      // Tocar som se houver novas emergências não resolvidas
      if (data.unresolvedCount > prevUnresolvedRef.current) {
        playAlertSound();
        
        // Notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 EMERGÊNCIA!', {
            body: 'Um entregador acionou o botão de pânico!',
            icon: '/icons/icon-192x192.png',
            tag: 'emergency',
            requireInteraction: true,
          });
        }
      }
      prevUnresolvedRef.current = data.unresolvedCount;
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }, [showResolved, playAlertSound]);

  const resolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    
    try {
      const res = await fetch('/api/admin/emergencies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          notes: notes[alertId] || '',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro');
      }

      toast({ title: '✅ Emergência resolvida' });
      await fetchAlerts();
    } catch (error) {
      toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setResolvingId(null);
    }
  };

  const enableSound = () => {
    getAudioContext();
    setSoundEnabled(true);
    toast({ title: 'Som ativado', description: 'Você receberá alertas sonoros de emergência.' });
  };

  useEffect(() => {
    fetchAlerts();
    
    // Solicitar permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Poll a cada 5 segundos
    pollRef.current = setInterval(fetchAlerts, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAlerts]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
            Central de Emergências
          </h1>
          {unresolvedCount > 0 && (
            <p className="text-red-500 animate-pulse">
              ⚠️ {unresolvedCount} emergência(s) ativa(s)!
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {!soundEnabled && (
            <Button onClick={enableSound} variant="outline" className="border-orange-500 text-orange-500">
              <Volume2 className="w-4 h-4 mr-2" />
              Ativar Som
            </Button>
          )}
          <Button onClick={fetchAlerts} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        <Button
          variant={!showResolved ? 'default' : 'outline'}
          onClick={() => setShowResolved(false)}
          className={!showResolved ? 'bg-red-600' : ''}
        >
          <Bell className="w-4 h-4 mr-2" />
          Ativas ({unresolvedCount})
        </Button>
        <Button
          variant={showResolved ? 'default' : 'outline'}
          onClick={() => setShowResolved(true)}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Todas
        </Button>
      </div>

      {/* Lista de Emergências */}
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-green-400">Tudo Tranquilo</h3>
            <p className="text-gray-400">Nenhuma emergência {showResolved ? '' : 'ativa'} no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`${
                !alert.isResolved 
                  ? 'border-red-500 bg-red-500/10 animate-pulse' 
                  : 'border-gray-600'
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className={`flex items-center ${
                    !alert.isResolved ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {!alert.isResolved ? (
                      <AlertTriangle className="w-5 h-5 mr-2 animate-bounce" />
                    ) : (
                      <CheckCircle className="w-5 h-5 mr-2" />
                    )}
                    {!alert.isResolved ? 'EMERGÊNCIA ATIVA' : 'Resolvida'}
                  </span>
                  <span className="text-sm text-gray-400 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {new Date(alert.createdAt).toLocaleString('pt-BR')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Info do Entregador */}
                <div className="bg-card p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="font-semibold">{alert.user.name || 'Sem nome'}</span>
                    </div>
                    {alert.user.phone && (
                      <a 
                        href={`tel:${alert.user.phone}`}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded flex items-center text-sm"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Ligar
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{alert.user.email}</p>
                  <p className="text-xs text-gray-500">Status: {alert.user.deliveryStatus}</p>
                </div>

                {/* Motivo */}
                {alert.reason && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded">
                    <p className="text-sm text-yellow-400">
                      <strong>Motivo:</strong> {alert.reason}
                    </p>
                  </div>
                )}

                {/* Localização */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    Lat: {alert.latitude.toFixed(6)}, Lng: {alert.longitude.toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm"
                  >
                    Abrir no Maps →
                  </a>
                </div>

                {/* Localização atual (se diferente) */}
                {alert.user.currentLatitude && alert.user.currentLongitude && (
                  <div className="flex items-center justify-between bg-blue-500/10 p-2 rounded">
                    <span className="text-sm text-blue-400">
                      Localização atual: {alert.user.currentLatitude.toFixed(6)}, {alert.user.currentLongitude.toFixed(6)}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${alert.user.currentLatitude},${alert.user.currentLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm"
                    >
                      Rastrear →
                    </a>
                  </div>
                )}

                {/* Resolução */}
                {alert.isResolved ? (
                  <div className="bg-green-500/10 p-2 rounded">
                    <p className="text-sm text-green-400">
                      Resolvida em: {new Date(alert.resolvedAt!).toLocaleString('pt-BR')}
                    </p>
                    {alert.resolutionNotes && (
                      <p className="text-xs text-gray-400 mt-1">Notas: {alert.resolutionNotes}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Notas de resolução (opcional)"
                      value={notes[alert.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [alert.id]: e.target.value })}
                      className="bg-card"
                    />
                    <Button
                      onClick={() => resolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {resolvingId === alert.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Marcar como Resolvida
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
