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

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('PWA ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.log('SW registration note:', err);
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

      if (permission === 'granted') {
        sendLocalPushNotification(
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
    requestNotificationPermission,
    sendLocalPushNotification,
  };
}
