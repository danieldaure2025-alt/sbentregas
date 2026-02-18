'use client';

/**
 * Native Notifications Helper for Capacitor APK
 * Provides native-like push notification experience similar to iFood
 * Uses @capacitor/push-notifications for Android native push
 */

import { playNotificationSound, initializePushNotifications as initWebPushNotifications, onForegroundMessage, setupServiceWorkerMessageListener } from './firebase-client';

// Dynamic import for Capacitor Push Notifications
let PushNotifications: any = null;

// Load Capacitor Push Notifications plugin
async function loadPushNotificationsPlugin() {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try to import the Capacitor plugin
    const module = await import('@capacitor/push-notifications');
    PushNotifications = module.PushNotifications;
    return PushNotifications;
  } catch (error) {
    console.log('Capacitor PushNotifications plugin not available:', error);
    return null;
  }
}

// Check if running in Capacitor native app
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() || cap?.getPlatform?.() === 'android' || cap?.getPlatform?.() === 'ios';
}

// Check if Capacitor plugins are available
export function hasCapacitorPushNotifications(): boolean {
  if (typeof window === 'undefined') return false;
  return isNativeApp();
}

/**
 * Initialize native push notifications for Capacitor app
 * This should be called once when the app starts
 */
export async function initializeNativePushNotifications(): Promise<boolean> {
  if (!isNativeApp()) {
    console.log('Not a native app');
    return false;
  }

  try {
    // Load the plugin dynamically
    const plugin = await loadPushNotificationsPlugin();
    if (!plugin) {
      console.log('PushNotifications plugin not available');
      return false;
    }

    // Check current permissions
    const permStatus = await plugin.checkPermissions();
    console.log('Current permission status:', permStatus);

    // Request permission if not granted
    if (permStatus.receive !== 'granted') {
      const permResult = await plugin.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.log('Native push notification permission denied');
        return false;
      }
    }

    // Remove any existing listeners to avoid duplicates
    await plugin.removeAllListeners();

    // Register for push notifications
    await plugin.register();

    // Listen for registration success
    await plugin.addListener('registration', async (token: { value: string }) => {
      console.log('📱 Native push registration success, token:', token.value?.substring(0, 20) + '...');
      
      // Save token to server
      try {
        const response = await fetch('/api/users/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken: token.value }),
        });
        if (response.ok) {
          console.log('✅ Native FCM token saved to server');
        } else {
          console.error('❌ Failed to save native FCM token:', await response.text());
        }
      } catch (error) {
        console.error('❌ Failed to save native FCM token:', error);
      }
    });

    // Listen for registration errors
    await plugin.addListener('registrationError', (error: any) => {
      console.error('❌ Native push registration error:', error);
    });

    // Listen for push notifications received while app is in foreground
    await plugin.addListener('pushNotificationReceived', (notification: any) => {
      console.log('🔔 Native push notification received in foreground:', notification);
      // Play sound for foreground notifications
      playNotificationSound();
      
      // Show local notification for foreground messages
      if (notification.title || notification.body) {
        showLocalNotification(notification.title, notification.body, notification.data);
      }
    });

    // Listen for push notification actions (tap)
    await plugin.addListener('pushNotificationActionPerformed', (action: any) => {
      console.log('👆 Native push notification action:', action);
      
      const data = action.notification?.data || {};
      let targetUrl = '/dashboard/available';

      if (data.type === 'NEW_ORDER' && data.orderId) {
        targetUrl = '/dashboard/available';
      } else if (data.type === 'ORDER_STATUS' && data.orderId) {
        targetUrl = `/dashboard/my-deliveries/${data.orderId}`;
      } else if (data.type === 'CHAT_MESSAGE' && data.orderId) {
        targetUrl = `/dashboard/my-deliveries/${data.orderId}`;
      } else if (data.type === 'EMERGENCY') {
        targetUrl = '/dashboard/emergencies';
      }

      // Navigate to the target URL
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl;
      }
    });

    console.log('✅ Native push notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize native push notifications:', error);
    return false;
  }
}

/**
 * Show local notification on Android for foreground messages
 */
async function showLocalNotification(title: string, body: string, data?: any) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    
    // Check permissions
    const permResult = await LocalNotifications.checkPermissions();
    if (permResult.display !== 'granted') {
      const reqResult = await LocalNotifications.requestPermissions();
      if (reqResult.display !== 'granted') return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: title || 'Daure Express',
          body: body || 'Nova notificação',
          sound: 'default',
          extra: data,
          smallIcon: 'ic_notification',
          iconColor: '#f97316',
        }
      ]
    });
  } catch (error) {
    // LocalNotifications plugin may not be available, that's OK
    console.log('LocalNotifications not available for foreground display');
  }
}

/**
 * Universal push notification initializer
 * Automatically detects native vs web environment
 */
export async function initializeUniversalPushNotifications(): Promise<{ success: boolean; isNative: boolean }> {
  if (isNativeApp() && hasCapacitorPushNotifications()) {
    // Native app - use Capacitor
    const success = await initializeNativePushNotifications();
    return { success, isNative: true };
  } else {
    // Web app - use Firebase
    setupServiceWorkerMessageListener();
    const token = await initWebPushNotifications();
    return { success: !!token, isNative: false };
  }
}

/**
 * Listen for foreground messages (universal)
 */
export function onUniversalForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (isNativeApp() && hasCapacitorPushNotifications()) {
    // For native, the listener is already set up in initializeNativePushNotifications
    // This is mainly for compatibility
    return null;
  } else {
    // Web - use Firebase
    return onForegroundMessage(callback);
  }
}

/**
 * Check if push notifications are available
 */
export function isPushNotificationsAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Native app
  if (isNativeApp() && hasCapacitorPushNotifications()) {
    return true;
  }
  
  // Web browser
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
  if (typeof window === 'undefined') return 'default';
  
  if (isNativeApp()) {
    try {
      const plugin = await loadPushNotificationsPlugin();
      if (!plugin) return 'default';
      
      const result = await plugin.checkPermissions();
      return result.receive === 'granted' ? 'granted' : result.receive === 'denied' ? 'denied' : 'default';
    } catch {
      return 'default';
    }
  }
  
  return Notification.permission;
}

/**
 * Get device push token (for debugging/admin)
 */
export async function getDevicePushToken(): Promise<string | null> {
  if (!isNativeApp()) return null;
  
  try {
    const plugin = await loadPushNotificationsPlugin();
    if (!plugin) return null;
    
    return new Promise((resolve) => {
      plugin.addListener('registration', (token: { value: string }) => {
        resolve(token.value);
      });
      
      setTimeout(() => resolve(null), 5000); // Timeout after 5 seconds
    });
  } catch {
    return null;
  }
}
