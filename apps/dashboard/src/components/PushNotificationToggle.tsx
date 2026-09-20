import React from 'react';
import { Bell, BellOff, BellRing, Sparkles } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const PushNotificationToggle: React.FC = () => {
  const {
    isPushSupported,
    notificationPermission,
    requestNotificationPermission,
    sendLocalPushNotification,
  } = usePWA();

  if (!isPushSupported) {
    return null;
  }

  const isGranted = notificationPermission === 'granted';
  const isDenied = notificationPermission === 'denied';

  return (
    <div className="flex items-center gap-2">
      {isGranted ? (
        <button
          onClick={() => {
            sendLocalPushNotification(
              '🎯 Тестовое Push-уведомление ScanAgent',
              'HH.ru: Найдена вакансия "Senior Fullstack / Next.js" (скоринг: 10/10, совпадение 95%)'
            );
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
          title="Push-уведомления включены. Нажмите для отправки тестового уведомления"
        >
          <BellRing className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span className="hidden sm:inline">Push активны</span>
        </button>
      ) : isDenied ? (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-800/80 text-gray-400 border border-gray-700 text-xs"
          title="Push-уведомления заблокированы в настройках браузера"
        >
          <BellOff className="w-3.5 h-3.5 text-gray-500" />
          <span className="hidden sm:inline">Push откл.</span>
        </span>
      ) : (
        <button
          onClick={requestNotificationPermission}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition"
          title="Включить Push-уведомления о новых вакансиях"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Включить Push</span>
          <span className="sm:hidden">Push</span>
        </button>
      )}
    </div>
  );
};
