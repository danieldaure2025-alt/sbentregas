import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
  return admin;
}

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
  sound?: string;
  channelId?: string; // Android notification channel
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  fcmToken: string,
  notification: PushNotificationData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const firebaseAdmin = getFirebaseAdmin();
    const messaging = firebaseAdmin.messaging();

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200, 100, 400],
        },
        fcmOptions: {
          link: '/dashboard/available',
        },
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: notification.channelId || 'high_importance_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          ...(notification.data?.imageUrl && { imageUrl: notification.data.imageUrl }),
        },
      },
    };

    const response = await messaging.send(message);
    console.log('Push notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendPushNotificationToMultiple(
  fcmTokens: string[],
  notification: PushNotificationData
): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
  if (fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  try {
    const firebaseAdmin = getFirebaseAdmin();
    const messaging = firebaseAdmin.messaging();

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200, 100, 400],
        },
        fcmOptions: {
          link: '/dashboard/available',
        },
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: notification.channelId || 'high_importance_channel',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          ...(notification.data?.imageUrl && { imageUrl: notification.data.imageUrl }),
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    const errors: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        errors.push(`Token ${idx}: ${resp.error.message}`);
      }
    });

    console.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failures`);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors,
    };
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    return { successCount: 0, failureCount: fcmTokens.length, errors: [error.message] };
  }
}

/**
 * Send new order notification to all online delivery persons
 */
export async function sendNewOrderNotification(
  fcmTokens: string[],
  orderDetails: {
    orderId: string;
    originAddress: string;
    destinationAddress: string;
    price: number;
    distance: number;
  }
): Promise<{ successCount: number; failureCount: number }> {
  const notification: PushNotificationData = {
    title: '🚀 NOVO PEDIDO DISPONÍVEL!',
    body: `R$ ${orderDetails.price.toFixed(2)} - ${orderDetails.distance.toFixed(1)}km\n${orderDetails.originAddress.split(',')[0]} → ${orderDetails.destinationAddress.split(',')[0]}`,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'NEW_ORDER',
      orderId: orderDetails.orderId,
      price: orderDetails.price.toString(),
      distance: orderDetails.distance.toString(),
    },
  };

  const result = await sendPushNotificationToMultiple(fcmTokens, notification);
  return { successCount: result.successCount, failureCount: result.failureCount };
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusNotification(
  fcmToken: string,
  orderDetails: {
    orderId: string;
    status: string;
    message: string;
  }
): Promise<boolean> {
  const notification: PushNotificationData = {
    title: '📦 Atualização do Pedido',
    body: orderDetails.message,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'ORDER_STATUS',
      orderId: orderDetails.orderId,
      status: orderDetails.status,
    },
  };

  const result = await sendPushNotification(fcmToken, notification);
  return result.success;
}

/**
 * Send emergency alert notification to admin
 */
export async function sendEmergencyNotification(
  fcmTokens: string[],
  emergencyDetails: {
    deliveryPersonName: string;
    orderId?: string;
    location?: { lat: number; lng: number };
  }
): Promise<{ successCount: number; failureCount: number }> {
  const notification: PushNotificationData = {
    title: '🚨 ALERTA DE EMERGÊNCIA!',
    body: `${emergencyDetails.deliveryPersonName} acionou o botão de emergência!`,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'EMERGENCY',
      deliveryPersonName: emergencyDetails.deliveryPersonName,
      orderId: emergencyDetails.orderId || '',
      lat: emergencyDetails.location?.lat.toString() || '',
      lng: emergencyDetails.location?.lng.toString() || '',
    },
  };

  const result = await sendPushNotificationToMultiple(fcmTokens, notification);
  return { successCount: result.successCount, failureCount: result.failureCount };
}
