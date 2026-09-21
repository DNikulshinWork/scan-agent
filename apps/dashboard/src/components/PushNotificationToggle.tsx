import React, { useState } from 'react';
import { Bell, BellOff, BellRing, Loader2, Send, Check } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface PushNotificationToggleProps {
  apiUrl?: string;
}

export const PushNotificationToggle: React.FC<PushNotificationToggleProps> = ({ apiUrl }) => {
  const {
    isPushSupported,
    notificationPermission,
    isWebPushSubscribed,
    isWebPushLoading,
    subscribeToWebPush,
    sendServerTestPush,
  } = usePWA();

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isPushSupported) {
    return null;
  }

  const isDenied = notificationPermission === 'denied';

  const handleSubscribe = async () => {
    const res = await subscribeToWebPush(apiUrl);
    setFeedback(res.ok ? 'Web Push подключен!' : res.message || 'Ошибка');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSendTest = async () => {
    setFeedback('Отправка с сервера...');
    const res = await sendServerTestPush(apiUrl);
    setFeedback(res.ok ? '✓ Web Push отправлен сервером!' : res.message || 'Ошибка');
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="flex items-center gap-2">
      {feedback && (
        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-lg animate-fadeIn hidden md:inline-flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-400" />
          <span>{feedback}</span>
        </span>
      )}

      {isWebPushSubscribed ? (
        <button
          onClick={handleSendTest}
          disabled={isWebPushLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition cursor-pointer"
          title="Web Push активен (сервер VAPID). Нажмите для отправки реального пуша с сервера"
        >
          {isWebPushLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
          ) : (
            <BellRing className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          )}
          <span className="hidden sm:inline">Web Push активен</span>
          <span className="text-[10px] text-rose-400/80 bg-rose-500/20 px-1.5 py-0.5 rounded ml-0.5 hidden lg:inline">
            Тест с сервера
          </span>
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
          onClick={handleSubscribe}
          disabled={isWebPushLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition cursor-pointer"
          title="Включить настоящий Web Push с сервера (VAPID, работает даже при закрытой вкладке)"
        >
          {isWebPushLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : (
            <Bell className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="hidden sm:inline">Включить Web Push</span>
          <span className="sm:hidden">Push</span>
        </button>
      )}
    </div>
  );
};
