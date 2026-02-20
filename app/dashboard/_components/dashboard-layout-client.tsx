'use client';

import { WhatsAppButton } from '@/components/shared/whatsapp-button';
import { SidebarProvider, useSidebarState } from '@/contexts/sidebar-context';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/lib/firebase-client';
import {
  initializeUniversalPushNotifications,
  isPushNotificationsAvailable,
  onUniversalForegroundMessage
} from '@/lib/native-notifications';
import { UserRole } from '@prisma/client';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { OrderNotificationBubble } from '@/components/shared/order-notification-bubble';

const Navbar = dynamic(() => import('@/components/shared/navbar').then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
});

const Sidebar = dynamic(() => import('@/components/shared/sidebar').then((mod) => ({ default: mod.Sidebar })), {
  ssr: false,
});

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { data: session } = useSession() || {};
  const [notificationsInitialized, setNotificationsInitialized] = useState(false);
  const initAttempted = useRef(false);

  const userRole = session?.user?.role as UserRole | undefined;
  const useSidebarLayout = userRole === UserRole.ADMIN || userRole === UserRole.CLIENT;

  // Setup push notifications for all online users
  useEffect(() => {
    let unsubscribeForeground: (() => void) | null = null;

    const setupNotifications = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      try {
        if (!isPushNotificationsAvailable()) {
          console.log('Push notifications not supported');
          return;
        }

        const { success, isNative } = await initializeUniversalPushNotifications();

        if (success) {
          setNotificationsInitialized(true);
          console.log(`Push notifications initialized (${isNative ? 'Native APK' : 'Web'})`);
        }

        if (!isNative) {
          unsubscribeForeground = onUniversalForegroundMessage((payload) => {
            console.log('Foreground notification received:', payload);
            playNotificationSound();
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

    const timer = setTimeout(setupNotifications, 500);

    return () => {
      clearTimeout(timer);
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [toast]);

  // Sidebar layout for ADMIN and CLIENT
  if (useSidebarLayout) {
    return (
      <SidebarProvider>
        <SidebarLayoutInner>{children}</SidebarLayoutInner>
      </SidebarProvider>
    );
  }

  // Standard topbar layout for DELIVERY_PERSON and ESTABLISHMENT
  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      <Navbar variant="topbar" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <WhatsAppButton />
      {userRole === UserRole.DELIVERY_PERSON && <OrderNotificationBubble />}
    </div>
  );
}

// Inner component that can use the sidebar context
function SidebarLayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const marginLeft = isMobile ? 0 : collapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)]">
      <Sidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft }}
      >
        <Navbar variant="minimal" />
        <main className="px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </div>
      <WhatsAppButton />
    </div>
  );
}

