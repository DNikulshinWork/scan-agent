'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { fetchLiveHhVacancies } from '../services/hhService';
import {
  Vacancy,
  FilterState,
  VacancyStatus,
  VacancyOutcome,
  DeveloperProfile,
  KeywordScoringRule,
} from '../types';
import { Sparkles, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, Server, Settings } from 'lucide-react';

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

  const [backendMeta, setBackendMeta] = useState<{
    database?: string;
    dbLatencyMs?: number;
    totalOrders?: number;
    isScanning?: boolean;
    lastScanAt?: string;
  }>({});

  useEffect(() => {
    // Read initial URL from env or localStorage
    const saved = localStorage.getItem('scan_agent_api_url');
    const defaultUrl = process.env.NEXT_PUBLIC_API_URL || 'https://scan-agent-api.onrender.com';
    const effectiveUrl = saved !== null ? saved : defaultUrl;
    setApiUrl(effectiveUrl);

    if (effectiveUrl) {
      checkBackendHealth(effectiveUrl);
    }
  }, []);

  const checkBackendHealth = async (url: string) => {
    const clean = url.trim().replace(/\/$/, '');
    if (!clean) {
      setBackendOnline(false);
      return;
    }
    try {
      const res = await fetch(`${clean}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setBackendOnline(true);
        setBackendMeta({
          database: data.database,
          dbLatencyMs: data.dbLatencyMs,
          totalOrders: data.totalOrders,
          isScanning: data.scanner?.isScanning,
          lastScanAt: data.scanner?.lastScanAt,
        });

        // Загружаем актуальные вакансии из базы данных Neon
        try {
          const vacRes = await fetch(`${clean}/api/vacancies?limit=100`);
          if (vacRes.ok) {
            const dbVacancies = await vacRes.json();
            if (Array.isArray(dbVacancies) && dbVacancies.length > 0) {
              setVacancies(dbVacancies);
            }
          }
        } catch {
          // тихо продолжаем со стандартными
        }
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  const handleSaveApiUrl = (newUrl: string) => {
    setApiUrl(newUrl);
    localStorage.setItem('scan_agent_api_url', newUrl);
    if (newUrl) {
      checkBackendHealth(newUrl);
    } else {
      setBackendOnline(false);
    }
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

    // Sync to backend if configured
    if (apiUrl && backendOnline) {
      try {
        await fetch(`${apiUrl.replace(/\/$/, '')}/api/vacancies/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (err) {
        console.warn('Could not sync status with backend:', err);
      }
    }
  };

  const handleOutcomeChange = async (id: string, newOutcome: VacancyOutcome) => {
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, outcome: newOutcome } : v))
    );

    if (apiUrl && backendOnline) {
      try {
        await fetch(`${apiUrl.replace(/\/$/, '')}/api/vacancies/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outcome: newOutcome }),
        });
      } catch (err) {
        console.warn('Could not sync outcome with backend:', err);
      }
    }
  };

  const handleUpdatePitch = (id: string, newPitch: string) => {
    setVacancies((prev) =>
      prev.map((v) => (v.id === id ? { ...v, pitch: newPitch } : v))
    );
    if (selectedVacancy && selectedVacancy.id === id) {
      setSelectedVacancy((prev) => (prev ? { ...prev, pitch: newPitch } : null));
    }
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    setScanMessage('Запуск сбора вакансий через Playwright на бэкенде (обход 403)...');

    try {
      if (apiUrl && backendOnline) {
        const clean = apiUrl.trim().replace(/\/$/, '');
        const res = await fetch(`${clean}/api/scan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync: true, maxPages: 2 }),
        });

        if (res.ok) {
          const scanData = await res.json();
          // Мгновенно запрашиваем обновленный список вакансий из базы Neon
          const vacRes = await fetch(`${clean}/api/vacancies?limit=100`);
          if (vacRes.ok) {
            const dbVacancies = await vacRes.json();
            if (Array.isArray(dbVacancies) && dbVacancies.length > 0) {
              setVacancies(dbVacancies);
            }
          }
          const count = scanData.scanned !== undefined ? scanData.scanned : 0;
          setScanMessage(`Сбор через Playwright завершён: найдено ${count} релевантных вакансий, данные обновлены в Neon.`);
          setTimeout(() => setScanMessage(null), 5000);
          return;
        } else if (res.status === 409) {
          setScanMessage('Сбор уже выполняется другим процессом/cron-задачей. Ожидайте...');
          setTimeout(() => setScanMessage(null), 4000);
          return;
        }
      }

      // Резервный клиентский поиск при отсутствии соединения с бэкендом
      const scanResult = await fetchLiveHhVacancies(
        'TypeScript OR React OR Node.js OR Next.js',
        true,
        scoringRules
      );

      const liveItems = scanResult.vacancies;

      setVacancies((prev) => {
        const existingIds = new Set(prev.map((p) => p.orderId));
        const newItems = liveItems.filter((item) => !existingIds.has(item.orderId));
        return [...newItems, ...prev];
      });

      if (scanResult.warning) {
        setScanMessage(scanResult.warning);
        setTimeout(() => setScanMessage(null), 8000);
      } else {
        setScanMessage(`Успешно получено ${liveItems.length} вакансий`);
        setTimeout(() => setScanMessage(null), 4000);
      }
    } catch (err: any) {
      setScanMessage(`Ошибка сканирования: ${err.message || 'Не удалось выполнить сбор'}`);
      setTimeout(() => setScanMessage(null), 5000);
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

      {/* Backend Banner if offline */}
      {backendOnline === false && apiUrl && (
        <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-2 text-xs text-gray-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                Бэкенд Fastify (<code className="text-rose-300 font-mono text-[11px]">{apiUrl}</code>) недоступен. Работа в автономном режиме клиентского HH API.
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium"
            >
              Настроить API
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
                  <h3 className="text-base font-semibold text-white">Нет вакансий по заданным фильтрам</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Попробуйте снизить минимальный порог соответствия или сбросить поисковый запрос.
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
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {groupedVacancies.new.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                        Новые предложения ({groupedVacancies.new.length})
                      </h2>
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

                {groupedVacancies.applied.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">
                        Отклики отправлены ({groupedVacancies.applied.length})
                      </h2>
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

                {groupedVacancies.skipped.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-gray-800">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                        Архив и пропущенные ({groupedVacancies.skipped.length})
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            onUpdateRules={setScoringRules}
          />
        )}

        {activeTab === 'plan' && <ArchitecturePlanView />}
      </main>

      {/* Vacancy Details & Pitch Generator Modal */}
      <VacancyDetailsModal
        vacancy={selectedVacancy}
        onClose={() => setSelectedVacancy(null)}
        onUpdatePitch={handleUpdatePitch}
      />

      {/* Fastify Backend API Settings Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiUrl={apiUrl}
        onSaveApiUrl={handleSaveApiUrl}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        vacanciesCount={counts.all}
      />
    </div>
  );
}
