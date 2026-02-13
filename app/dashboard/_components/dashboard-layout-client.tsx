'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from 'react';
import { WhatsAppButton } from '@/components/shared/whatsapp-button';
import { 
  initializeUniversalPushNotifications,
  onUniversalForegroundMessage,
  isNativeApp,
  isPushNotificationsAvailable,
} from '@/lib/native-notifications';
import { playNotificationSound } from '@/lib/firebase-client';
import { useToast } from '@/hooks/use-toast';

const Navbar = dynamic(() => import('@/components/shared/navbar').then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
});

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const initAttempted = useRef(false);

  // Setup push notifications for all online users - Native APK style (auto-register)
  useEffect(() => {
    let unsubscribeForeground: (() => void) | null = null;

    const setupNotifications = async () => {
      // Prevent multiple initialization attempts
      if (initAttempted.current) return;
      initAttempted.current = true;

      try {
        // Check if push notifications are available
        if (!isPushNotificationsAvailable()) {
          console.log('Push notifications not supported');
          return;
        }

        // Native APK model: Auto-initialize notifications
        // No repeated permission requests - once granted, it stays granted
        const { success, isNative } = await initializeUniversalPushNotifications();
        
        if (success) {
          setNotificationsInitialized(true);
          console.log(`Push notifications initialized (${isNative ? 'Native APK' : 'Web'})`);
        }

        // Setup foreground message listener (web only - native handles it differently)
        if (!isNative) {
          unsubscribeForeground = onUniversalForegroundMessage((payload) => {
            console.log('Foreground notification received:', payload);
            
            // Always play sound for notifications
            playNotificationSound();

            // Show toast
            toast({
              title: payload.notification?.title || 'Nova Notificação',
              description: payload.notification?.body || '',
            });
          });
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    // Small delay to ensure page is fully loaded before requesting permissions
    const timer = setTimeout(setupNotifications, 500);

    return () => {
      clearTimeout(timer);
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <WhatsAppButton />
    </div>
  );
}
