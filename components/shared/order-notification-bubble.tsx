'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@prisma/client';
import {
    MapPin, Flag, User,
    CheckCircle, XCircle, Loader2, Package, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL = 5000;
const ALERT_INTERVAL = 2500;
const ALERT_MAX_DURATION = 90000;

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

export function OrderNotificationBubble() {
    const { data: session } = useSession();
    const router = useRouter();
    const { toast } = useToast();

    const userRole = session?.user?.role as UserRole | undefined;
    const isDeliveryPerson = userRole === UserRole.DELIVERY_PERSON;

    const [pendingOffer, setPendingOffer] = useState<PendingOffer | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [responding, setResponding] = useState(false);

    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const alertStartTimeRef = useRef<number | null>(null);
    const currentOfferIdRef = useRef<string | null>(null);
    const pendingOfferRef = useRef<PendingOffer | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        pendingOfferRef.current = pendingOffer;
    }, [pendingOffer]);

    // Audio context
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    // Play urgent alert sound
    const playAlertSound = useCallback(() => {
        try {
            const ctx = getAudioContext();
            const playTone = (freq: number, startTime: number, duration: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'square';
                gain.gain.value = 1.0;
                osc.start(ctx.currentTime + startTime);
                osc.stop(ctx.currentTime + startTime + duration);
            };

            for (let cycle = 0; cycle < 3; cycle++) {
                const baseTime = cycle * 0.5;
                playTone(1200, baseTime + 0.0, 0.08);
                playTone(1200, baseTime + 0.12, 0.08);
                playTone(1500, baseTime + 0.24, 0.2);
            }

            if ('vibrate' in navigator) {
                navigator.vibrate([300, 100, 300, 100, 300, 100, 600]);
            }
        } catch (e) {
            console.error('Erro ao tocar som:', e);
        }
    }, [getAudioContext]);

    // Stop repeating alerts
    const stopAlerts = useCallback(() => {
        if (alertIntervalRef.current) {
            clearInterval(alertIntervalRef.current);
            alertIntervalRef.current = null;
        }
        alertStartTimeRef.current = null;
        currentOfferIdRef.current = null;
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }
    }, []);

    // Start repeating alerts
    const startAlerts = useCallback((offerId: string) => {
        if (currentOfferIdRef.current === offerId && alertIntervalRef.current) return;
        stopAlerts();
        currentOfferIdRef.current = offerId;
        alertStartTimeRef.current = Date.now();

        const triggerAlert = () => {
            const elapsed = Date.now() - (alertStartTimeRef.current || 0);
            playAlertSound();
            if (elapsed >= ALERT_MAX_DURATION) {
                stopAlerts();
            }
        };

        triggerAlert();
        alertIntervalRef.current = setInterval(triggerAlert, ALERT_INTERVAL);
    }, [playAlertSound, stopAlerts]);

    // Poll for status
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/delivery-person/status');
            if (!res.ok) return;
            const data = await res.json();

            if (data.pendingOffer) {
                const current = pendingOfferRef.current;
                const isNew = !current || current.id !== data.pendingOffer.id;
                setPendingOffer(data.pendingOffer);
                setCountdown(data.pendingOffer.timeRemaining || 0);

                if (isNew) {
                    startAlerts(data.pendingOffer.id);
                    setExpanded(true);
                }
            } else {
                if (pendingOfferRef.current) {
                    stopAlerts();
                }
                setPendingOffer(null);
                setExpanded(false);
            }
        } catch (error) {
            console.error('Erro polling status:', error);
        }
    }, [startAlerts, stopAlerts]);

    // Polling - only for delivery persons
    useEffect(() => {
        if (!isDeliveryPerson) return;

        fetchStatus();
        pollRef.current = setInterval(fetchStatus, POLL_INTERVAL);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            stopAlerts();
        };
    }, [isDeliveryPerson, fetchStatus, stopAlerts]);

    // Countdown timer
    useEffect(() => {
        if (!pendingOffer || countdown <= 0) return;

        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [pendingOffer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Respond to offer
    const respondToOffer = useCallback(async (accept: boolean) => {
        if (!pendingOffer) return;
        stopAlerts();
        setResponding(true);

        try {
            let latitude, longitude;
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
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
                    offerId: pendingOffer.id,
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
                toast({ title: '✅ Pedido Aceito!', description: 'Direcionando para a coleta...' });
                router.push('/dashboard/available');
            } else {
                toast({ title: 'Pedido Recusado', description: data.message });
                if (data.paused) {
                    toast({ title: '⚠️ Pausado', description: 'Muitas rejeições hoje.', variant: 'destructive' });
                }
            }

            setPendingOffer(null);
            setExpanded(false);
        } catch (error) {
            toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setResponding(false);
        }
    }, [pendingOffer, stopAlerts, toast, router]);

    // Don't render if not delivery person or no offer
    if (!isDeliveryPerson || !pendingOffer) return null;

    const timerColor = countdown <= 10 ? 'from-red-600 to-red-500'
        : countdown <= 30 ? 'from-yellow-500 to-orange-500'
            : 'from-green-500 to-emerald-500';

    const timerBg = countdown <= 10 ? 'bg-red-600'
        : countdown <= 30 ? 'bg-yellow-500'
            : 'bg-green-600';

    // EXPANDED MODAL
    if (expanded) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    onClick={() => setExpanded(false)}
                />

                {/* Modal */}
                <div className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 animate-in slide-in-from-bottom-8 duration-300">
                    <div className="bg-[hsl(220,20%,12%)] border border-orange-500/50 rounded-2xl shadow-2xl shadow-orange-500/20 overflow-hidden">

                        {/* Timer bar */}
                        <div className="h-1.5 bg-gray-800 relative overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${timerColor} transition-all duration-1000 ease-linear`}
                                style={{ width: `${Math.min((countdown / 60) * 100, 100)}%` }}
                            />
                        </div>

                        {/* Header */}
                        <div className="p-4 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center animate-pulse">
                                        <Package className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-orange-400">NOVO PEDIDO!</h3>
                                    <p className="text-xs text-gray-400">Aceite antes do tempo acabar</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`${timerBg} text-white text-2xl font-mono font-bold px-3 py-1 rounded-xl ${countdown <= 10 ? 'animate-pulse' : ''}`}>
                                    {countdown}s
                                </div>
                                <button
                                    onClick={() => setExpanded(false)}
                                    className="text-gray-500 hover:text-gray-300 p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Order details */}
                        <div className="px-4 pb-3 space-y-3">
                            {/* Value highlight */}
                            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                                <p className="text-xs text-green-300 mb-0.5">Valor da corrida</p>
                                <p className="text-3xl font-bold text-green-400">
                                    R$ {pendingOffer.order.price.toFixed(2)}
                                </p>
                            </div>

                            {/* Addresses */}
                            <div className="space-y-2 bg-[hsl(220,20%,16%)] p-3 rounded-xl">
                                <div className="flex items-start gap-2">
                                    <div className="mt-1">
                                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Coleta</p>
                                        <p className="text-sm text-gray-200 truncate">{pendingOffer.order.originAddress}</p>
                                    </div>
                                </div>
                                <div className="ml-1.5 border-l-2 border-dashed border-gray-600 h-3" />
                                <div className="flex items-start gap-2">
                                    <div className="mt-1">
                                        <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Entrega</p>
                                        <p className="text-sm text-gray-200 truncate">{pendingOffer.order.destinationAddress}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-[hsl(220,20%,16%)] rounded-xl p-2 text-center">
                                    <MapPin className="w-4 h-4 text-blue-400 mx-auto mb-0.5" />
                                    <p className="text-[10px] text-gray-500">Até você</p>
                                    <p className="text-sm font-bold text-blue-400">{pendingOffer.distanceToPickup.toFixed(1)} km</p>
                                </div>
                                <div className="bg-[hsl(220,20%,16%)] rounded-xl p-2 text-center">
                                    <Flag className="w-4 h-4 text-purple-400 mx-auto mb-0.5" />
                                    <p className="text-[10px] text-gray-500">Rota total</p>
                                    <p className="text-sm font-bold text-purple-400">{pendingOffer.order.distance.toFixed(1)} km</p>
                                </div>
                                <div className="bg-[hsl(220,20%,16%)] rounded-xl p-2 text-center">
                                    <User className="w-4 h-4 text-gray-400 mx-auto mb-0.5" />
                                    <p className="text-[10px] text-gray-500">Cliente</p>
                                    <p className="text-sm font-bold text-gray-200 truncate">{pendingOffer.order.client.name.split(' ')[0]}</p>
                                </div>
                            </div>

                            {/* Notes */}
                            {pendingOffer.order.notes && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2">
                                    <p className="text-xs text-yellow-300">📝 {pendingOffer.order.notes}</p>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-1">
                                <Button
                                    onClick={() => respondToOffer(false)}
                                    disabled={responding}
                                    variant="outline"
                                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl py-5"
                                >
                                    <XCircle className="w-5 h-5 mr-1.5" />
                                    Recusar
                                </Button>
                                <Button
                                    onClick={() => respondToOffer(true)}
                                    disabled={responding}
                                    className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-lg font-bold rounded-xl py-5 shadow-lg shadow-green-500/25"
                                >
                                    {responding ? (
                                        <Loader2 className="w-5 h-5 mr-1.5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5 mr-1.5" />
                                    )}
                                    ACEITAR
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // FLOATING BUBBLE (collapsed)
    return (
        <div className="fixed bottom-24 right-4 z-[9998]">
            <button
                onClick={() => setExpanded(true)}
                className="relative group"
            >
                {/* Outer pulse ring */}
                <div className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-30" />
                <div className="absolute -inset-2 rounded-full bg-orange-500/20 animate-pulse" />

                {/* Main bubble */}
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/40 flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95">
                    <Package className="w-7 h-7 text-white animate-bounce" />
                </div>

                {/* Timer badge */}
                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${timerBg} flex items-center justify-center shadow-lg ${countdown <= 10 ? 'animate-pulse' : ''}`}>
                    <span className="text-xs font-bold text-white font-mono">{countdown}</span>
                </div>

                {/* Price badge */}
                <div className="absolute -bottom-1 -left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                    R$ {pendingOffer.order.price.toFixed(2)}
                </div>
            </button>
        </div>
    );
}
