import React, { useState } from 'react';
import { Briefcase, BarChart3, User, Server, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
import { PushNotificationToggle } from './PushNotificationToggle';
import { AuthUser } from '../services/authService';

const getAssetUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH.replace(/\/$/, '');
    return `${base}/${cleanPath}`;
  }
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/scan-agent')) {
    return `/scan-agent/${cleanPath}`;
  }
  return `./${cleanPath}`;
};

export const BrandLogo: React.FC = () => {
  const [hasError, setHasError] = useState(false);
  const iconSrc = getAssetUrl('icon.svg');

  if (hasError) {
    return (
      <div
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-red-950 p-2 flex items-center justify-center shadow-lg shadow-rose-950/50 border border-rose-500/30 shrink-0 select-none"
        title="ScanAgent"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-rose-100"
        >
          <circle cx="12" cy="12" r="9" className="text-rose-500/50" stroke="currentColor" />
          <path d="M12 3a9 9 0 0 1 9 9" stroke="#f43f5e" strokeWidth="2.5" />
          <path d="M12 7a5 5 0 0 1 5 5" stroke="#06b6d4" />
          <circle cx="12" cy="12" r="2.5" fill="#10b981" stroke="#10b981" />
          <line x1="12" y1="12" x2="18.5" y2="5.5" stroke="#f43f5e" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-rose-950/50 shrink-0 border border-rose-500/20 overflow-hidden bg-gray-900/90 flex items-center justify-center">
      <img
        src={iconSrc}
        alt="ScanAgent"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
};

interface NavbarProps {
  activeTab: 'vacancies' | 'stats' | 'profile' | 'plan';
  setActiveTab: (tab: 'vacancies' | 'stats' | 'profile' | 'plan') => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  vacanciesCount: number;
  onOpenSettings?: () => void;
  onOpenAudit?: () => void;
  backendOnline?: boolean;
  apiUrl?: string;
  authUser?: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onTriggerScan,
  isScanning,
  vacanciesCount,
  onOpenSettings,
  onOpenAudit,
  backendOnline,
  apiUrl,
  authUser,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-1.5 sm:gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandLogo />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate">
                  ScanAgent
                </span>
                <span className="hidden min-[380px]:inline-block px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                  PWA
                </span>
                {backendOnline !== undefined && (
                  <span
                    onClick={onOpenSettings}
                    className={`cursor-pointer inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium rounded-full border shrink-0 transition-colors ${
                      backendOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                    }`}
                    title={
                      backendOnline
                        ? 'Бэкенд Fastify API + Neon DB подключен'
                        : 'Автономный режим: данные загружаются из локального кэша IndexedDB'
                    }
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
                      }`}
                    />
                    <span className="hidden md:inline">
                      {backendOnline ? 'Бэкенд Онлайн' : 'IndexedDB Кэш'}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 hidden md:block truncate">
                Мониторинг вакансий HH.ru на фильтрах · Render & Neon & GitHub Pages
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Hidden on mobile, handled by MobileBottomNav) */}
          <nav className="hidden sm:flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setActiveTab('vacancies')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vacancies'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Вакансии</span>
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${activeTab === 'vacancies' ? 'bg-rose-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                {vacanciesCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Статистика</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Резюме & Стек</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'plan'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>План & Деплой</span>
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <PushNotificationToggle apiUrl={apiUrl} />

            {onOpenAudit && (
              <button
                type="button"
                onClick={onOpenAudit}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-rose-300 hover:text-rose-200 text-xs rounded-xl border border-gray-800 hover:border-rose-700/60 transition shrink-0"
                title="Аудит всех 7 секретов и ключей Render"
                aria-label="Аудит секретов"
              >
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span className="hidden xl:inline text-[11px] font-medium">Аудит секретов</span>
              </button>
            )}

            {authUser && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/90 hover:bg-gray-800 text-gray-300 text-xs rounded-xl border border-gray-800 transition shrink-0"
                title={`Авторизован: ${authUser.name} (${authUser.email || authUser.username || ''})`}
              >
                <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] border border-rose-500/30 shrink-0">
                  {authUser.name ? authUser.name.charAt(0) : 'D'}
                </div>
                <span className="hidden lg:inline text-[11px] font-medium text-gray-300 max-w-[100px] truncate">
                  {authUser.username || (authUser.name ? authUser.name.split(' ')[0] : 'Admin')}
                </span>
              </button>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-xl border border-gray-800 transition shrink-0"
                title="Параметры безопасности, API-ключей и источника данных"
                aria-label="Настройки"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-900/20 transition-colors shrink-0"
              title="Запустить сбор вакансий через наш бэкенд"
              aria-label="Собрать вакансии"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline whitespace-nowrap">
                {isScanning ? 'Сканирование...' : 'Собрать вакансии'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
