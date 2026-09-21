'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { FilterBar } from '../components/FilterBar';
import { VacancyCard } from '../components/VacancyCard';
import { VacancyDetailsModal } from '../components/VacancyDetailsModal';
import { StatsView } from '../components/StatsView';
import { ProfileView } from '../components/ProfileView';
import { ArchitecturePlanView } from '../components/ArchitecturePlanView';
import { ApiSettingsModal } from '../components/ApiSettingsModal';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { initialVacancies, initialProfile, defaultScoringRules } from '../data/mockData';
import {
  loadVacanciesWithCache,
  triggerBackendScanJob,
  syncVacancyUpdate,
  checkBackendStatus,
  fetchScoringRules,
  DEFAULT_BACKEND_URL,
} from '../services/backendService';
import { getCachedVacancies, getCacheMeta } from '../services/indexedDbStorage';
import {
  Vacancy,
  FilterState,
  VacancyStatus,
  VacancyOutcome,
  DeveloperProfile,
  KeywordScoringRule,
} from '../types';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Server, Database, HardDrive } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'vacancies' | 'stats' | 'profile' | 'plan'>('vacancies');
  const [vacancies, setVacancies] = useState<Vacancy[]>(initialVacancies);
  const [profile, setProfile] = useState<DeveloperProfile>(initialProfile);
  const [scoringRules, setScoringRules] = useState<KeywordScoringRule>(defaultScoringRules);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Backend API URL configuration
  const [apiUrl, setApiUrl] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | undefined>(undefined);
  const [dataSource, setDataSource] = useState<'backend' | 'cache' | 'fallback'>('cache');
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [backendMeta, setBackendMeta] = useState<{
    database?: string;
    dbLatencyMs?: number;
    totalOrders?: number;
    isScanning?: boolean;
    lastScanAt?: string;
  }>({});

  const refreshData = useCallback(async (targetUrl?: string) => {
    const url = targetUrl || apiUrl || DEFAULT_BACKEND_URL;
    
    // 1. Проверяем доступность бэкенда Fastify + Neon DB
    const status = await checkBackendStatus(url);
    setBackendOnline(status.ok);
    if (status.ok && status.data) {
      setBackendMeta({
        database: status.data.database,
        dbLatencyMs: status.data.dbLatencyMs,
        totalOrders: status.data.totalOrders,
        isScanning: status.data.scanner?.isScanning,
        lastScanAt: status.data.scanner?.lastScanAt || undefined,
      });
    }

    // 2. Загружаем вакансии через бэкенд с автоматическим кэшированием в IndexedDB
    const result = await loadVacanciesWithCache(url);
    if (result.vacancies.length > 0) {
      setVacancies(result.vacancies);
    }
    setDataSource(result.source);
    if (result.totalCached) setCacheCount(result.totalCached);
    if (result.lastSyncAt) setLastSyncTime(result.lastSyncAt);

    if (result.warning && result.source === 'cache') {
      setScanMessage(result.warning);
      setTimeout(() => setScanMessage(null), 7000);
    }
  }, [apiUrl]);

  useEffect(() => {
    let isMounted = true;

    // 1. Мгновенная гидратация из локального кэша IndexedDB (0 миллисекунд ожидания)
    getCachedVacancies().then((cached) => {
      if (isMounted && cached.length > 0) {
        setVacancies(cached);
        setCacheCount(cached.length);
        setDataSource('cache');
      }
    });

    getCacheMeta().then((meta) => {
      if (isMounted && meta.lastSyncAt) {
        setLastSyncTime(meta.lastSyncAt);
      }
    });

    // 2. Читаем сохраненный URL и запускаем фоновую синхронизацию с бэкендом
    const saved = localStorage.getItem('scan_agent_api_url');
    const defaultUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL;
    const effectiveUrl = saved !== null ? saved : defaultUrl;
    setApiUrl(effectiveUrl);

    refreshData(effectiveUrl);

    // 3. Загружаем scoring rules из базы данных Neon
    fetchScoringRules(effectiveUrl).then(({ rules }) => {
      if (isMounted && rules) {
        setScoringRules(rules);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  const handleSaveApiUrl = (newUrl: string) => {
    setApiUrl(newUrl);
    localStorage.setItem('scan_agent_api_url', newUrl);
    refreshData(newUrl);
  };

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    minScore: 0,
    searchQuery: '',
    selectedTag: '',
    remoteOnly: false,
    minSalary: 0,
    experienceLevel: 'all',
  });

  // Unique tags for filter pills
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    vacancies.forEach((v) => {
      v.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [vacancies]);

  // Status counts
  const counts = useMemo(() => {
    const res = { all: vacancies.length, new: 0, applied: 0, skipped: 0 };
    vacancies.forEach((v) => {
      if (v.status === 'new') res.new++;
      else if (v.status === 'applied') res.applied++;
      else if (v.status === 'skipped') res.skipped++;
    });
    return res;
  }, [vacancies]);

  // Filtered vacancies list
  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (filters.status !== 'all' && v.status !== filters.status) return false;
      if (filters.minScore > 0 && v.score < filters.minScore) return false;
      if (filters.minSalary > 0 && v.salaryNum && v.salaryNum < filters.minSalary) return false;
      if (filters.remoteOnly && !v.isRemote) return false;
      if (filters.selectedTag && !v.tags?.includes(filters.selectedTag)) return false;
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const inTitle = v.title.toLowerCase().includes(q);
        const inEmployer = v.employer.toLowerCase().includes(q);
        const inDesc = v.description.toLowerCase().includes(q);
        const inTags = v.tags?.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inEmployer && !inDesc && !inTags) return false;
      }
      return true;
    });
  }, [vacancies, filters]);

  const groupedVacancies = useMemo(() => {
    return {
      new: filteredVacancies.filter((v) => v.status === 'new'),
      applied: filteredVacancies.filter((v) => v.status === 'applied'),
      skipped: filteredVacancies.filter((v) => v.status === 'skipped'),
    };
  }, [filteredVacancies]);

  // Обработка изменения статуса с сохранением в IndexedDB и отправкой на бэкенд
  const handleStatusChange = async (id: string, newStatus: VacancyStatus) => {
    setVacancies((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: newStatus,
              appliedAt: newStatus === 'applied' ? new Date().toISOString() : null,
            }
          : v
      )
    );

    await syncVacancyUpdate(apiUrl || DEFAULT_BACKEND_URL, id, { status: newStatus });
  };

  // Обработка изменения исхода отклика
  const handleOutcomeChange = async (id: string, newOutcome: VacancyOutcome) => {
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, outcome: newOutcome } : v))
    );

    await syncVacancyUpdate(apiUrl || DEFAULT_BACKEND_URL, id, { outcome: newOutcome });
  };

  const handleUpdatePitch = async (id: string, newPitch: string) => {
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, pitch: newPitch } : v))
    );
    if (selectedVacancy && selectedVacancy.id === id) {
      setSelectedVacancy((prev) => (prev ? { ...prev, pitch: newPitch } : null));
    }
    await syncVacancyUpdate(apiUrl || DEFAULT_BACKEND_URL, id, { pitch: newPitch });
  };

  // Запуск сбора вакансий через бэкенд
  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanMessage('Запуск сбора вакансий через Playwright на сервере (без 403 ошибок)...');

    try {
      const scanResult = await triggerBackendScanJob(apiUrl || DEFAULT_BACKEND_URL, {
        maxPages: 2,
        sync: true,
      });

      if (!scanResult.ok) {
        setScanMessage(scanResult.message || 'Сбор уже выполняется другим процессом.');
        setTimeout(() => setScanMessage(null), 4000);
        return;
      }

      // После завершения сбора обновляем список вакансий и локальный кэш IndexedDB
      await refreshData();

      setScanMessage(
        `Сбор через Playwright завершён: найдено ${scanResult.scanned} вакансий, данные сохранены в БД Neon и кэшированы в IndexedDB.`
      );
      setTimeout(() => setScanMessage(null), 6000);
    } catch (err: any) {
      console.warn('Ошибка сбора через бэкенд:', err);
      setScanMessage(`Бэкенд недоступен или засыпает: ${err.message || 'Повторите попытку через пару секунд'}`);
      setTimeout(() => setScanMessage(null), 6000);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col selection:bg-rose-600 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerScan={handleTriggerScan}
        isScanning={isScanning}
        vacanciesCount={counts.all}
        onOpenSettings={() => setIsSettingsOpen(true)}
        backendOnline={backendOnline}
        apiUrl={apiUrl}
      />

      {/* Global Toast / Notification */}
      {scanMessage && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between animate-fade-in">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
            <span>{scanMessage}</span>
          </div>
        </div>
      )}

      {/* Backend Banner if offline / using cache */}
      {backendOnline === false && (
        <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-2.5 text-xs text-gray-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>
                Бэкенд на Render просыпается или недоступен. Работа в автономном режиме: отображается <strong>{cacheCount || vacancies.length}</strong> вакансий из локального кэша IndexedDB.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium shrink-0"
            >
              Параметры кэша ⚙️
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8">
        {/* PWA Install Banner */}
        <PWAInstallPrompt />

        {activeTab === 'vacancies' && (
          <div className="space-y-6">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              counts={counts}
              availableTags={availableTags}
            />

            {filteredVacancies.length === 0 ? (
              <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-800/80 border border-gray-700 flex items-center justify-center mx-auto text-gray-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Нет подходящих вакансий</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Попробуйте снизить минимальный порог скоринга или сбросить фильтр по стеку технологий.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFilters({
                      status: 'all',
                      minScore: 0,
                      searchQuery: '',
                      selectedTag: '',
                      remoteOnly: false,
                      minSalary: 0,
                      experienceLevel: 'all',
                    })
                  }
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-xl border border-gray-700 transition"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* 1. New / Relevant Vacancies */}
                {groupedVacancies.new.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          Новые предложения
                        </h2>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {groupedVacancies.new.length}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 hidden sm:inline">
                        Прошли фильтрацию по вашему стеку резюме
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedVacancies.new.map((vacancy) => (
                        <VacancyCard
                          key={vacancy.id}
                          vacancy={vacancy}
                          onSelect={setSelectedVacancy}
                          onStatusChange={handleStatusChange}
                          onOutcomeChange={handleOutcomeChange}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 2. Applied Vacancies */}
                {groupedVacancies.applied.length > 0 && (
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                          Отклики в работе
                        </h2>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {groupedVacancies.applied.length}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 hidden sm:inline">
                        Ожидают ответа работодателя или приглашения
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedVacancies.applied.map((vacancy) => (
                        <VacancyCard
                          key={vacancy.id}
                          vacancy={vacancy}
                          onSelect={setSelectedVacancy}
                          onStatusChange={handleStatusChange}
                          onOutcomeChange={handleOutcomeChange}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. Skipped Vacancies */}
                {groupedVacancies.skipped.length > 0 && (
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                        <h2 className="text-sm sm:text-base font-semibold text-gray-300 tracking-tight">
                          Пропущенные / Отклонённые
                        </h2>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                          {groupedVacancies.skipped.length}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 hidden sm:inline">
                        Не подошли по условиям или технологиям
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                      {groupedVacancies.skipped.map((vacancy) => (
                        <VacancyCard
                          key={vacancy.id}
                          vacancy={vacancy}
                          onSelect={setSelectedVacancy}
                          onStatusChange={handleStatusChange}
                          onOutcomeChange={handleOutcomeChange}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && <StatsView vacancies={vacancies} />}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            onUpdateProfile={setProfile}
            scoringRules={scoringRules}
            onUpdateScoringRules={setScoringRules}
            apiUrl={apiUrl}
          />
        )}

        {activeTab === 'plan' && <ArchitecturePlanView />}
      </main>

      {/* Modal for Vacancy Full Details & Pitch generation */}
      {selectedVacancy && (
        <VacancyDetailsModal
          vacancy={selectedVacancy}
          onClose={() => setSelectedVacancy(null)}
          onStatusChange={handleStatusChange}
          onOutcomeChange={handleOutcomeChange}
          onUpdatePitch={handleUpdatePitch}
        />
      )}

      {/* Modal for API Configuration */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={apiUrl}
        onSaveApiUrl={handleSaveApiUrl}
        onRefreshFromBackend={refreshData}
      />

      {/* Mobile Bottom Navigation Bar for PWA */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        vacanciesCount={counts.all}
      />
    </div>
  );
}
