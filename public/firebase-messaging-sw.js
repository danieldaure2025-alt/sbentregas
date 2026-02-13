// Firebase Messaging Service Worker
// This runs in the background and receives push notifications even when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAqGETFcGB3np6RKl__OzNyoHV0JoAI4no',
  authDomain: 'daure-express.firebaseapp.com',
  projectId: 'daure-express',
  storageBucket: 'daure-express.firebasestorage.app',
  messagingSenderId: '697031136169',
  appId: '1:697031136169:web:c68e0560c6c24bbe1daab8',
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Novo Pedido!';
  const notificationOptions = {
    body: payload.notification?.body || 'Você tem um novo pedido disponível',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    // Strong vibration pattern for alert
    vibrate: [300, 100, 300, 100, 300, 100, 300, 100, 500],
    requireInteraction: true,
    tag: payload.data?.orderId || 'default',
    data: payload.data || {},
    // Silent false ensures system plays notification sound
    silent: false,
    actions: [
      {
        action: 'view',
        title: 'Ver Pedido',
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
      },
    ],
  };

  // Show notification with sound
  self.registration.showNotification(notificationTitle, notificationOptions);

  // Send message to all clients to play sound
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        payload: payload,
      });
    });
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Default action - open the available orders page
  let targetUrl = '/dashboard/available';

  // If there's an orderId and type is NEW_ORDER, go to the order details
  if (data.type === 'NEW_ORDER' && data.orderId) {
    targetUrl = '/dashboard/available';
  } else if (data.type === 'ORDER_STATUS' && data.orderId) {
    targetUrl = `/dashboard/my-deliveries/${data.orderId}`;
  } else if (data.type === 'EMERGENCY') {
    targetUrl = '/dashboard/emergencies';
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});
