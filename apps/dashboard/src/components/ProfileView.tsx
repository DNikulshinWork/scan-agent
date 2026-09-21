import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  Check,
  Plus,
  Trash2,
  ShieldAlert,
  SlidersHorizontal,
  Save,
  Briefcase,
  ExternalLink,
  Code,
  Github,
  Mail,
  Phone,
  Send,
  Globe,
  Database,
  Loader2,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';
import { DeveloperProfile, KeywordScoringRule } from '../types';
import { saveScoringRules, fetchScoringRules, DEFAULT_BACKEND_URL } from '../services/backendService';

interface ProfileViewProps {
  profile: DeveloperProfile;
  onUpdateProfile: (profile: DeveloperProfile) => void;
  scoringRules: KeywordScoringRule;
  onUpdateRules?: (rules: KeywordScoringRule) => void;
  onUpdateScoringRules?: (rules: KeywordScoringRule) => void;
  apiUrl?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  scoringRules,
  onUpdateRules,
  onUpdateScoringRules,
  apiUrl,
}) => {
  const [profileData, setProfileData] = useState<DeveloperProfile>(profile);
  const [rulesData, setRulesData] = useState<KeywordScoringRule>(scoringRules);
  const [newCoreTag, setNewCoreTag] = useState('');
  const [newRelatedTag, setNewRelatedTag] = useState('');
  const [newNiceTag, setNewNiceTag] = useState('');
  const [newStopWord, setNewStopWord] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [syncedFromBackend, setSyncedFromBackend] = useState(false);

  // При монтировании загружаем актуальные правила из базы данных бэкенда
  useEffect(() => {
    let active = true;
    fetchScoringRules(apiUrl).then(({ rules, source }) => {
      if (!active) return;
      if (rules) {
        setRulesData(rules);
        if (source === 'backend') {
          setSyncedFromBackend(true);
        }
        if (onUpdateRules) onUpdateRules(rules);
        if (onUpdateScoringRules) onUpdateScoringRules(rules);
      }
    });
    return () => {
      active = false;
    };
  }, [apiUrl]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    // 1. Сохраняем профиль
    onUpdateProfile(profileData);

    // 2. Обновляем родительские стейты правил
    if (onUpdateRules) onUpdateRules(rulesData);
    if (onUpdateScoringRules) onUpdateScoringRules(rulesData);

    // 3. Отправляем правила на бэкенд в PostgreSQL Neon
    try {
      const res = await saveScoringRules(apiUrl || DEFAULT_BACKEND_URL, rulesData);
      setSaveStatus({
        success: res.ok,
        message: res.message,
      });
      if (res.ok) {
        setSyncedFromBackend(true);
      }
    } catch (e: any) {
      setSaveStatus({
        success: false,
        message: 'Ошибка сохранения на сервере. Сохранено локально в кэш.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
    }
  };

  // Add / Remove helpers for tags
  const addTag = (category: 'core' | 'related' | 'nice', value: string, setter: (s: string) => void) => {
    const val = value.trim().toLowerCase();
    if (!val) return;
    const currentList = rulesData[category] || [];
    if (!currentList.includes(val)) {
      setRulesData((prev) => ({
        ...prev,
        [category]: [...(prev[category] || []), val],
      }));
    }
    setter('');
  };

  const removeTag = (category: 'core' | 'related' | 'nice', tag: string) => {
    setRulesData((prev) => ({
      ...prev,
      [category]: (prev[category] || []).filter((t) => t !== tag),
    }));
  };

  const handleAddStopWord = () => {
    const word = newStopWord.trim().toLowerCase();
    if (word && !rulesData.hardExclude.includes(word)) {
      setRulesData((prev) => ({
        ...prev,
        hardExclude: [...prev.hardExclude, word],
      }));
      setNewStopWord('');
    }
  };

  const handleRemoveStopWord = (word: string) => {
    setRulesData((prev) => ({
      ...prev,
      hardExclude: prev.hardExclude.filter((w) => w !== word),
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header with Save Button & Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-rose-400" />
              <span>Резюме и Конфигурация Scoring Rules</span>
            </h2>
            {syncedFromBackend && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <Database className="w-3 h-3" />
                Neon DB Synced
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Детерминированная фильтрация вакансий HH.ru. Правила сохраняются в базу данных Neon и применяются сканером.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {saveStatus && (
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-xl border flex items-center gap-1.5 animate-fadeIn ${
                saveStatus.success
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800/60'
              }`}
            >
              {saveStatus.success ? <Check className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
              <span>{saveStatus.message}</span>
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition-colors cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Сохранение в Neon...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить на бэкенде</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scoring Rules: Core, Related, Nice-to-have, Hard Exclude */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-rose-400" />
            <span>Параметры скоринга вакансий (Scoring Rules в Neon DB)</span>
          </h3>
          <span className="text-[11px] text-gray-400 font-mono">
            GET / PUT /api/scoring-rules
          </span>
        </div>

        {/* 1. Core Stack (+10 pts) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Core Stack (Ключевые технологии: +10 баллов за каждое совпадение)</span>
            </label>
            <span className="text-[11px] text-gray-400">{rulesData.core?.length || 0} тегов</span>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2.5 rounded-xl bg-gray-950 border border-gray-800/80">
            {rulesData.core?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-rose-950/40 text-rose-200 border border-rose-800/50 group"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeTag('core', skill)}
                  className="text-rose-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newCoreTag}
              onChange={(e) => setNewCoreTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('core', newCoreTag, setNewCoreTag)}
              placeholder="Добавить в Core (например: next.js, nestjs, react)..."
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={() => addTag('core', newCoreTag, setNewCoreTag)}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        {/* 2. Related Stack (+5 pts) */}
        <div className="space-y-2.5 pt-2 border-t border-gray-800/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Related Stack (Смежные технологии: +5 баллов за совпадение)</span>
            </label>
            <span className="text-[11px] text-gray-400">{rulesData.related?.length || 0} тегов</span>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2.5 rounded-xl bg-gray-950 border border-gray-800/80">
            {rulesData.related?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-blue-950/40 text-blue-200 border border-blue-800/50 group"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeTag('related', skill)}
                  className="text-blue-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newRelatedTag}
              onChange={(e) => setNewRelatedTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('related', newRelatedTag, setNewRelatedTag)}
              placeholder="Добавить в Related (например: redis, prisma, tailwind)..."
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => addTag('related', newRelatedTag, setNewRelatedTag)}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        {/* 3. Nice to have Stack (+3 pts) */}
        <div className="space-y-2.5 pt-2 border-t border-gray-800/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nice to Have (Плюсы и полезный опыт: +3 балла)</span>
            </label>
            <span className="text-[11px] text-gray-400">{rulesData.nice?.length || 0} тегов</span>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2.5 rounded-xl bg-gray-950 border border-gray-800/80">
            {rulesData.nice?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-950/40 text-emerald-200 border border-emerald-800/50 group"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeTag('nice', skill)}
                  className="text-emerald-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newNiceTag}
              onChange={(e) => setNewNiceTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag('nice', newNiceTag, setNewNiceTag)}
              placeholder="Добавить в Nice (например: graphql, kubernetes, rabbitmq)..."
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => addTag('nice', newNiceTag, setNewNiceTag)}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        {/* 4. Hard Exclude Stop Words (0 pts / Immediate Trash) */}
        <div className="space-y-2.5 pt-2 border-t border-gray-800/60">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Стоп-слова для HH.ru (Hard Exclude — мгновенный отсев в мусор)</span>
            </label>
            <span className="text-[11px] text-gray-400">{rulesData.hardExclude?.length || 0} слов</span>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2.5 rounded-xl bg-gray-950 border border-gray-800/80">
            {rulesData.hardExclude?.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-rose-950/20 text-rose-300 border border-rose-900/40"
              >
                <span>{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStopWord(word)}
                  className="text-rose-500 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              value={newStopWord}
              onChange={(e) => setNewStopWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStopWord()}
              placeholder="Добавить стоп-слово (например: php, 1c, битрикс, java)..."
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={handleAddStopWord}
              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
          </div>
        </div>

        {/* 5. Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-800/60">
          <div>
            <label className="text-xs text-gray-300 block mb-1">
              Минимальный порог скоринга (баллы)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={rulesData.minScore}
              onChange={(e) =>
                setRulesData((prev) => ({ ...prev, minScore: Number(e.target.value) || 0 }))
              }
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-gray-300 block mb-1">
              Минимальный фильтр зарплаты (руб.)
            </label>
            <input
              type="number"
              step={10000}
              min={0}
              value={rulesData.minSalaryFilter}
              onChange={(e) =>
                setRulesData((prev) => ({
                  ...prev,
                  minSalaryFilter: Number(e.target.value) || 0,
                }))
              }
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Developer Overview & Contacts */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-rose-400" />
          <span>Личные данные и контакты из резюме</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">ФИО разработчика</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Желаемая должность / Headline</label>
            <input
              type="text"
              value={profileData.headline}
              onChange={(e) => setProfileData((prev) => ({ ...prev, headline: e.target.value }))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Quick Contact Badges */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-300">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800">
            <Phone className="w-3.5 h-3.5 text-rose-400" />
            <span>{profileData.phone}</span>
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800">
            <Mail className="w-3.5 h-3.5 text-rose-400" />
            <span>{profileData.email}</span>
          </span>
          <a
            href="https://t.me/nikulshin_dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-blue-400 hover:text-blue-300"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{profileData.telegram}</span>
          </a>
          <a
            href={profileData.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-gray-200 hover:text-white"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
          <a
            href={profileData.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-rose-300 hover:text-rose-200"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Портфолио</span>
          </a>
        </div>
      </div>

      {/* Projects from Dmitry's Resume */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <span>Проекты из резюме (используются в шаблонах откликов)</span>
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            {profileData.projects?.length || 0} проектов
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {profileData.projects?.map((proj, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-gray-950 border border-gray-800/80 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white leading-snug">{proj.title}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-900 text-rose-300 border border-rose-900/30">
                    {proj.category}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">
                  {proj.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-900">
                {proj.stack.map((st) => (
                  <span
                    key={st}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-300 border border-gray-800"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Resume Raw Text */}
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Полный текст резюме с HeadHunter</h3>
          </div>
          <span className="text-[11px] text-gray-500">
            {profileData.hhResumeRawText.length} символов
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Текстовая копия обновленного резюме Дмитрия Никульшина. Всегда под рукой для копирования и обновления.
        </p>

        <textarea
          rows={12}
          value={profileData.hhResumeRawText}
          onChange={(e) => setProfileData((prev) => ({ ...prev, hhResumeRawText: e.target.value }))}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono leading-relaxed"
          placeholder="Текст резюме HeadHunter..."
        />
      </div>
    </div>
  );
};
