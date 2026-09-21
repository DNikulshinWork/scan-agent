import React, { useState } from 'react';
import { Bell, BellOff, BellRing, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const PushNotificationToggle: React.FC = () => {
  const {
    isPushSupported,
    notificationPermission,
    requestNotificationPermission,
    sendLocalPushNotification,
  } = usePWA();

  const [showDeniedHelp, setShowDeniedHelp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isPushSupported) {
    return null;
  }

  const isGranted = notificationPermission === 'granted';
  const isDenied = notificationPermission === 'denied';

  const handleTestNotification = async () => {
    await sendLocalPushNotification(
      '🎯 ScanAgent HH: Вакансия 10/10!',
      'Senior Fullstack / Next.js / TypeScript (95% совпадение с резюме).'
    );
    setToastMessage('Тестовый Push отправлен!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') {
      setToastMessage('Push-уведомления успешно включены!');
      setTimeout(() => setToastMessage(null), 3000);
    } else if (res === 'denied') {
      setShowDeniedHelp(true);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="absolute top-10 right-0 z-50 bg-emerald-900/95 border border-emerald-500 text-emerald-100 text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 whitespace-nowrap animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {isGranted ? (
        <button
          onClick={handleTestNotification}
          className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition cursor-pointer shrink-0"
          title="Push-уведомления активны. Нажмите для отправки теста"
        >
          <BellRing className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-400 animate-pulse" />
          <span className="hidden sm:inline">Push активны</span>
        </button>
      ) : isDenied ? (
        <button
          onClick={() => setShowDeniedHelp(true)}
          className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-gray-800/90 hover:bg-gray-800 text-amber-300/90 border border-amber-500/30 text-xs font-medium transition cursor-pointer shrink-0"
          title="Уведомления заблокированы в браузере. Нажмите для инструкции"
        >
          <BellOff className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Push откл.</span>
        </button>
      ) : (
        <button
          onClick={handleEnablePush}
          className="inline-flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition cursor-pointer shrink-0"
          title="Включить Push-уведомления о новых вакансиях"
        >
          <Bell className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Включить Push</span>
        </button>
      )}

      {/* Denied Help Modal */}
      {showDeniedHelp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative text-left">
            <button
              onClick={() => setShowDeniedHelp(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Push заблокирован в Chrome</h4>
                <p className="text-[11px] text-gray-400">В настройках сайта в браузере</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-300 my-4 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800">
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <p>Нажмите на значок настроек (ползунки или замок 🔒) слева в адресной строке Chrome.</p>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <p>Откройте <strong className="text-white">«Разрешения» (Permissions)</strong> → <strong className="text-white">«Уведомления»</strong>.</p>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <p>Переключите в положение <strong className="text-emerald-400">«Разрешить»</strong> и перезагрузите страницу.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowDeniedHelp(false);
                window.location.reload();
              }}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

