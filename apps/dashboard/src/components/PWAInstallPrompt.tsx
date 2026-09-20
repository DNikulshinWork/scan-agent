import React, { useState } from 'react';
import { Download, Share, CheckCircle2, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isInstalled || isDismissed) {
    return null;
  }

  if (isInstallable) {
    return (
      <div className="bg-gradient-to-r from-rose-900/90 to-red-950/90 border border-rose-700/80 rounded-2xl p-3.5 sm:p-4 mb-5 flex items-center justify-between gap-3 shadow-lg shadow-rose-950/40 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Установить ScanAgent как мобильное приложение</span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-rose-500/30 text-[10px] text-rose-200">
                PWA
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-200/80 mt-0.5">
              Быстрый запуск с домашнего экрана, офлайн-режим и фоновые Push-уведомления о вакансиях HH.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={installApp}
            className="px-3.5 py-2 rounded-xl bg-white text-rose-900 hover:bg-rose-50 font-bold text-xs shadow transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Установить</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800/40 transition"
            title="Закрыть подсказку"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isIOS) {
    return (
      <>
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-3.5 sm:p-4 mb-5 flex items-center justify-between gap-3 shadow-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-rose-400 shrink-0">
              <Share className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                Добавить на главный экран iPhone / iPad
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Запускайте как нативное приложение без браузерных рамок Safari.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition flex items-center gap-1.5"
            >
              <span>Как установить</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl text-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📱 Установка на iOS</span>
                </h3>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-5 text-xs sm:text-sm text-gray-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 text-xs font-bold">
                    1
                  </div>
                  <p>
                    В нижней панели Safari нажмите кнопку <strong>«Поделиться»</strong>{' '}
                    <Share className="inline w-4 h-4 text-blue-400 mx-1" />.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 text-xs font-bold">
                    2
                  </div>
                  <p>
                    Прокрутите список действий вниз и нажмите <strong>«На экран Домой»</strong> (+).
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-300 flex items-center justify-center shrink-0 text-xs font-bold">
                    3
                  </div>
                  <p>
                    Нажмите <strong>«Добавить»</strong> в верхнем правом углу экрана.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
