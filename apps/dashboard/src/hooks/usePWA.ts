import { useEffect, useState } from 'react';
import {
  fetchVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
  triggerServerTestPush,
  DEFAULT_BACKEND_URL,
} from '../services/backendService';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Push notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isWebPushSubscribed, setIsWebPushSubscribed] = useState(false);
  const [isWebPushLoading, setIsWebPushLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);
    setIsInstalled(standaloneCheck);

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Register Service Worker if available
    if ('serviceWorker' in navigator) {
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then(async (reg) => {
          console.log('PWA ServiceWorker registered with scope:', reg.scope);
          // Check existing push subscription
          try {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              setIsWebPushSubscribed(true);
            }
          } catch (e) {
            console.log('PushManager check note:', e);
          }
        })
        .catch((err) => {
          console.log('SW registration note:', err);
        });
    }

    // Check Notifications API support
    if ('Notification' in window && 'PushManager' in window) {
      setIsPushSupported(true);
      setNotificationPermission(Notification.permission);
    } else if ('Notification' in window) {
      setIsPushSupported(true);
      setNotificationPermission(Notification.permission);
    }

    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    }
  };

  /**
   * Оформление настоящей Web Push подписки (VAPID) на бэкенде
   */
  const subscribeToWebPush = async (apiUrl: string = DEFAULT_BACKEND_URL): Promise<{ ok: boolean; message?: string }> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, message: 'Web Push не поддерживается в этом браузере' };
    }

    setIsWebPushLoading(true);
    try {
      // 1. Запрос разрешения пользователя
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        setIsWebPushLoading(false);
        return { ok: false, message: 'Разрешение на уведомления отклонено' };
      }

      // 2. Получение VAPID-ключа с бэкенда
      const vapidKey = await fetchVapidPublicKey(apiUrl);
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // 3. Регистрация подписки в PushManager через Service Worker
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // 4. Отправка и сохранение PushSubscription в базе данных Neon
      await registerPushSubscription(apiUrl, subscription);

      setIsWebPushSubscribed(true);
      setIsWebPushLoading(false);
      return { ok: true, message: 'Web Push подписка активирована и сохранена в базе Neon!' };
    } catch (err: any) {
      setIsWebPushLoading(false);
      console.error('Ошибка Web Push подписки:', err);
      return { ok: false, message: err.message || 'Ошибка оформления Web Push подписки' };
    }
  };

  /**
   * Отписка от Web Push
   */
  const unsubscribeFromWebPush = async (apiUrl: string = DEFAULT_BACKEND_URL): Promise<{ ok: boolean }> => {
    setIsWebPushLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await unregisterPushSubscription(apiUrl, endpoint).catch(() => {});
        }
      }
      setIsWebPushSubscribed(false);
      setIsWebPushLoading(false);
      return { ok: true };
    } catch (err) {
      setIsWebPushLoading(false);
      return { ok: false };
    }
  };

  /**
   * Отправка серверного тестового Web Push через VAPID
   */
  const sendServerTestPush = async (apiUrl: string = DEFAULT_BACKEND_URL): Promise<{ ok: boolean; message: string }> => {
    try {
      let endpoint: string | undefined;
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          endpoint = sub.endpoint;
        }
      }
      const result = await triggerServerTestPush(apiUrl, endpoint);
      return { ok: true, message: result.message || 'Тестовый пуш отправлен с сервера' };
    } catch (err: any) {
      return { ok: false, message: err.message || 'Ошибка вызова Web Push с сервера' };
    }
  };

  const sendLocalPushNotification = (title: string, body: string, url?: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: './pwa-192x192.png',
          badge: './pwa-192x192.png',
          data: { url: url || './' },
        });
      });
    } else {
      new Notification(title, {
        body,
        icon: './pwa-192x192.png',
      });
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isStandalone,
    installApp,
    isPushSupported,
    notificationPermission,
    isWebPushSubscribed,
    isWebPushLoading,
    subscribeToWebPush,
    unsubscribeFromWebPush,
    sendServerTestPush,
    requestNotificationPermission,
    sendLocalPushNotification,
  };
}
