import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);
    setIsInstalled(standaloneCheck);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const swUrl = `${basePath}/sw.js`;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(swUrl, { scope: `${basePath}/` || '/' })
        .then((reg) => {
          console.log('PWA ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('SW registration with base path failed, trying relative:', err);
          navigator.serviceWorker.register('./sw.js').catch((e) => {
            console.error('PWA SW registration failed:', e);
          });
        });
    }

    if ('Notification' in window) {
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
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('PWA prompt execution error:', err);
    }
    return false;
  };

  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    try {
      let permission: NotificationPermission;
      try {
        permission = await Notification.requestPermission();
      } catch {
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission((status) => resolve(status));
        });
      }

      setNotificationPermission(permission);

      if (permission === 'granted') {
        await sendLocalPushNotification(
          '🔔 ScanAgent: Push-уведомления активны!',
          'Вы будете моментально получать оповещения о вакансиях с высоким скорингом соответствия.'
        );
      }
      return permission;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    }
  };

  const sendLocalPushNotification = async (title: string, body: string, url?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const iconPath = `${basePath}/pwa-192x192.png`;
    const targetUrl = url || `${basePath}/`;

    try {
      // Primary standard method for Android & Desktop PWA: ServiceWorkerRegistration.showNotification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, {
            body,
            icon: iconPath,
            badge: iconPath,
            data: { url: targetUrl },
          });
          return;
        }
      }

      // Fallback for desktop Safari/Chrome if SW is not ready yet
      try {
        new Notification(title, {
          body,
          icon: iconPath,
        });
      } catch (e) {
        console.warn('Desktop Notification fallback note:', e);
      }
    } catch (err) {
      console.error('Error sending local push notification:', err);
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
    requestNotificationPermission,
    sendLocalPushNotification,
  };
}
