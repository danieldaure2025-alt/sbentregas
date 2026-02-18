'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let audioContext: AudioContext | null = null;

/**
 * Play notification sound using Web Audio API (horn-like sound)
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;

  try {
    // Create or reuse AudioContext
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume if suspended (required by browsers after user interaction)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const ctx = audioContext;
    const now = ctx.currentTime;

    // Create oscillators for horn-like sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Horn frequencies
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.2);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(220, now + 0.2);

    // Volume envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gainNode.gain.setValueAtTime(0.4, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    // Connect and play
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    // Play second horn beep
    setTimeout(() => {
      if (!audioContext || audioContext.state === 'closed') return;
      const ctx2 = audioContext;
      const now2 = ctx2.currentTime;

      const osc3 = ctx2.createOscillator();
      const osc4 = ctx2.createOscillator();
      const gain2 = ctx2.createGain();

      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(440, now2);
      osc3.frequency.exponentialRampToValueAtTime(880, now2 + 0.1);

      osc4.type = 'square';
      osc4.frequency.setValueAtTime(220, now2);
      osc4.frequency.exponentialRampToValueAtTime(440, now2 + 0.1);

      gain2.gain.setValueAtTime(0, now2);
      gain2.gain.linearRampToValueAtTime(0.5, now2 + 0.02);
      gain2.gain.setValueAtTime(0.5, now2 + 0.2);
      gain2.gain.linearRampToValueAtTime(0, now2 + 0.4);

      osc3.connect(gain2);
      osc4.connect(gain2);
      gain2.connect(ctx2.destination);

      osc3.start(now2);
      osc4.start(now2);
      osc3.stop(now2 + 0.45);
      osc4.stop(now2 + 0.45);
    }, 400);

    // Also try to vibrate on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Setup listener for service worker messages (for background notification sounds)
 */
export function setupServiceWorkerMessageListener(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
      console.log('Received SW message to play sound');
      playNotificationSound();
    }
  });
}

/**
 * Initialize Firebase app (client-side only)
 */
export function initializeFirebase(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  
  if (!firebaseApp) {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
  }
  
  return firebaseApp;
}

/**
 * Get Firebase Messaging instance (client-side only)
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  
  const app = initializeFirebase();
  if (!app) return null;
  
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Error initializing Firebase Messaging:', error);
      return null;
    }
  }
  
  return messaging;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    console.log('🔔 [FCM] Verificando suporte a notificações...');
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('⚠️ [FCM] Este navegador não suporta notificações');
      return null;
    }

    console.log('🔔 [FCM] Permissão atual:', Notification.permission);
    
    // Request permission
    const permission = await Notification.requestPermission();
    console.log('🔔 [FCM] Resultado da solicitação de permissão:', permission);
    
    if (permission !== 'granted') {
      console.warn('⚠️ [FCM] Permissão de notificação negada pelo usuário');
      return null;
    }

    console.log('🔔 [FCM] Registrando service worker...');
    
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.error('❌ [FCM] Falha ao registrar service worker');
      return null;
    }
    console.log('✅ [FCM] Service worker registrado:', registration.scope);

    // Get FCM token
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) {
      console.error('❌ [FCM] Firebase Messaging não inicializado');
      return null;
    }

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('🔔 [FCM] Obtendo token com VAPID key:', vapidKey?.substring(0, 20) + '...');
    
    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('✅ [FCM] Token obtido com sucesso:', token.substring(0, 30) + '...');
    } else {
      console.warn('⚠️ [FCM] getToken retornou null/undefined');
    }
    
    return token;
  } catch (error) {
    console.error('❌ [FCM] Erro ao obter token FCM:', error);
    return null;
  }
}

/**
 * Register Firebase service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): (() => void) | null {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) return null;

  const unsubscribe = onMessage(messagingInstance, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });

  return unsubscribe;
}

/**
 * Save FCM token to server
 */
export async function saveFcmTokenToServer(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/users/fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fcmToken: token }),
    });

    if (!response.ok) {
      throw new Error('Failed to save FCM token');
    }

    console.log('FCM token saved to server');
    return true;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
}

/**
 * Remove FCM token from server (when user logs out or disables notifications)
 */
export async function removeFcmTokenFromServer(): Promise<boolean> {
  try {
    const response = await fetch('/api/users/fcm-token', {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove FCM token');
    }

    console.log('FCM token removed from server');
    return true;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return false;
  }
}

/**
 * Initialize push notifications for delivery person
 */
export async function initializePushNotifications(): Promise<string | null> {
  console.log('🔔 [FCM] Iniciando inicialização de push notifications...');
  
  const token = await requestNotificationPermission();
  
  if (token) {
    console.log('🔔 [FCM] Token obtido, salvando no servidor...');
    const saved = await saveFcmTokenToServer(token);
    if (saved) {
      console.log('✅ [FCM] Token salvo no servidor com sucesso!');
    } else {
      console.error('❌ [FCM] Falha ao salvar token no servidor');
    }
    return token;
  } else {
    console.warn('⚠️ [FCM] Não foi possível obter token FCM');
    return null;
  }
}
