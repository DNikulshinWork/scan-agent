import React, { useState } from 'react';
import {
  ExternalLink,
  Building2,
  MapPin,
  Calendar,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Trophy,
  XCircle,
  RotateCcw,
  Briefcase,
  ListChecks,
} from 'lucide-react';
import { Vacancy, VacancyStatus, VacancyOutcome, DeveloperProfile } from '../types';
import { initialProfile } from '../data/mockData';
import { buildAiChatPrompt, copyTextToClipboard } from '../utils/aiPromptGenerator';

interface VacancyCardProps {
  vacancy: Vacancy;
  profile?: DeveloperProfile;
  onStatusChange: (id: string, status: VacancyStatus) => void;
  onOutcomeChange: (id: string, outcome: VacancyOutcome) => void;
  onSelect: (vacancy: Vacancy) => void;
}

export const VacancyCard: React.FC<VacancyCardProps> = ({
  vacancy,
  profile = initialProfile,
  onStatusChange,
  onOutcomeChange,
  onSelect,
}) => {
  const [showPitch, setShowPitch] = useState(false);
  const [showStructuredInfo, setShowStructuredInfo] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);

  const handleCopyPitch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${vacancy.hook ? `${vacancy.hook}\n\n` : ''}${vacancy.pitch}`;
    copyTextToClipboard(textToCopy);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyAiPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = buildAiChatPrompt(vacancy, profile);
    const success = await copyTextToClipboard(prompt);
    if (success) {
      setCopiedAiPrompt(true);
      setTimeout(() => setCopiedAiPrompt(false), 2500);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 7) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    if (score >= 5) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const formatPublishDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isSkipped = vacancy.status === 'skipped';
  const hasStructuredDetails =
    (vacancy.responsibilities && vacancy.responsibilities.length > 0) ||
    (vacancy.requirements && vacancy.requirements.length > 0) ||
    (vacancy.conditions && vacancy.conditions.length > 0);

  const displaySkills = vacancy.keySkills && vacancy.keySkills.length > 0 ? vacancy.keySkills : vacancy.tags;

  return (
    <div
      id={`vacancy-card-${vacancy.id}`}
      className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col gap-4 ${
        isSkipped
          ? 'bg-gray-950/40 border-gray-900 opacity-60 hover:opacity-90'
          : 'bg-gray-900/80 border-gray-800 hover:border-gray-700/80 shadow-md shadow-black/20'
      }`}
    >
      {/* Header with Title, Match Score & Meta */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-red-600/20 text-red-300 border border-red-500/30">
              HH.ru
            </span>
            {vacancy.isRemote && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Удаленно
              </span>
            )}
            {vacancy.experienceRequirement && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-800 text-gray-300 border border-gray-700">
                {vacancy.experienceRequirement}
              </span>
            )}
            {vacancy.employment && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-800/80 text-gray-400 border border-gray-700/60 hidden sm:inline">
                {vacancy.employment}
              </span>
            )}
          </div>

          <h3
            id={`vacancy-title-${vacancy.id}`}
            onClick={() => onSelect(vacancy)}
            className="text-base sm:text-lg font-semibold text-white hover:text-rose-400 transition-colors cursor-pointer leading-snug pt-0.5"
          >
            {vacancy.title}
          </h3>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-400">
            <span className="flex items-center gap-1 text-gray-300 font-medium">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              {vacancy.employer}
            </span>
            <span>·</span>
            <span className="text-gray-300">{vacancy.city}</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-gray-400">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              {formatPublishDate(vacancy.publishedAt)}
            </span>
          </div>
        </div>

        {/* Match Score Badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div
            className={`px-3 py-1 rounded-xl border text-sm font-bold flex items-center gap-1.5 ${getScoreColor(
              vacancy.score
            )}`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{vacancy.score} / 10</span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {vacancy.matchPercentage ? `${vacancy.matchPercentage}% совпадение` : `${vacancy.keywordScore} pts`}
          </span>
        </div>
      </div>

      {/* Salary & Copy for AI Prompt action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-gray-800/60">
        <div className="text-base sm:text-lg font-bold text-emerald-400 tracking-tight flex items-baseline gap-1.5">
          <span>💰 {vacancy.price}</span>
          {vacancy.salaryGross !== undefined && (
            <span className="text-[11px] font-normal text-gray-400">
              {vacancy.salaryGross ? '(до вычета)' : '(на руки)'}
            </span>
          )}
        </div>

        {/* PRIMARY USER ACTION: Button to copy enriched vacancy prompt for external AI chat */}
        <button
          id={`btn-copy-ai-prompt-${vacancy.id}`}
          onClick={handleCopyAiPrompt}
          title="Сформировать и скопировать промпт с данными вакансии и профилем кандидата для вставки в ChatGPT, Claude, Gemini или DeepSeek"
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
            copiedAiPrompt
              ? 'bg-emerald-600 text-white border border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white border border-rose-500/40 shadow-rose-900/20'
          }`}
        >
          {copiedAiPrompt ? (
            <>
              <Check className="w-3.5 h-3.5 text-white animate-bounce" />
              <span>Скопировано для ИИ!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-rose-200" />
              <span>Скопировать для ИИ-чата</span>
            </>
          )}
        </button>
      </div>

      {/* Skills / Key Skills Tags */}
      {displaySkills && displaySkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displaySkills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className="text-[11px] px-2 py-0.5 rounded-md bg-gray-950 text-gray-300 border border-gray-800"
            >
              {skill}
            </span>
          ))}
          {displaySkills.length > 8 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-gray-900 text-gray-500">
              +{displaySkills.length - 8}
            </span>
          )}
        </div>
      )}

      {/* Filter Stack Verdict */}
      <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed bg-black/20 p-3 rounded-xl border border-gray-800/60">
        <span className="font-semibold text-rose-300 mr-1.5">Фильтр стека:</span>
        {vacancy.filterVerdict || vacancy.reason}
      </p>

      {/* Structured Vacancy Info (Responsibilities, Requirements, Conditions) */}
      {hasStructuredDetails && (
        <div className="space-y-2">
          <button
            onClick={() => setShowStructuredInfo(!showStructuredInfo)}
            className="text-xs font-medium text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
          >
            <ListChecks className="w-3.5 h-3.5 text-rose-400" />
            <span>
              {showStructuredInfo ? 'Скрыть детали вакансии с HH' : 'Показать требования и обязанности с HH'}
            </span>
            {showStructuredInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showStructuredInfo && (
            <div className="p-3.5 rounded-xl bg-gray-950/90 border border-gray-800 text-xs text-gray-300 space-y-3">
              {vacancy.responsibilities && vacancy.responsibilities.length > 0 && (
                <div className="space-y-1">
                  <span className="font-semibold text-rose-300 uppercase text-[10px] tracking-wider">
                    🎯 Обязанности:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-300 pl-1">
                    {vacancy.responsibilities.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {vacancy.requirements && vacancy.requirements.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-gray-900">
                  <span className="font-semibold text-rose-300 uppercase text-[10px] tracking-wider">
                    🛠 Требования:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-300 pl-1">
                    {vacancy.requirements.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {vacancy.conditions && vacancy.conditions.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-gray-900">
                  <span className="font-semibold text-rose-300 uppercase text-[10px] tracking-wider">
                    🎁 Условия:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-300 pl-1">
                    {vacancy.conditions.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expandable Cover Letter Pitch Box */}
      {vacancy.pitch && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPitch(!showPitch)}
            className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            {showPitch ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Скрыть подготовленный отклик</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Показать локальный отклик (Cover Letter)</span>
              </>
            )}
          </button>

          {showPitch && (
            <div className="p-4 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-200 space-y-3 relative group">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="font-semibold text-gray-400">Персонализированный питч для HH.ru</span>
                <button
                  onClick={handleCopyPitch}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors"
                >
                  {copiedPitch ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>

              {vacancy.hook && (
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-200 italic">
                  💡 {vacancy.hook}
                </div>
              )}

              <p className="whitespace-pre-line leading-relaxed text-gray-300">{vacancy.pitch}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions and Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          {vacancy.status !== 'applied' && (
            <button
              onClick={() => onStatusChange(vacancy.id, 'applied')}
              className="text-xs px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors flex items-center gap-1.5 min-h-[36px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Откликнулся</span>
            </button>
          )}

          {vacancy.status !== 'skipped' && (
            <button
              onClick={() => onStatusChange(vacancy.id, 'skipped')}
              className="text-xs px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors min-h-[36px]"
            >
              Пропустить
            </button>
          )}

          {vacancy.status !== 'new' && (
            <button
              onClick={() => onStatusChange(vacancy.id, 'new')}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex items-center gap-1 min-h-[36px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Outcome controls if applied */}
          {vacancy.status === 'applied' && (
            <div className="flex items-center gap-1.5 bg-gray-950 px-2 py-1 rounded-lg border border-gray-800 text-xs">
              <span className="text-gray-500 hidden xs:inline">Итог:</span>
              <button
                onClick={() => onOutcomeChange(vacancy.id, 'won')}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-colors min-h-[32px] ${
                  vacancy.outcome === 'won'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-gray-400 hover:text-emerald-400'
                }`}
              >
                <Trophy className="w-3 h-3" />
                <span>Оффер</span>
              </button>
              <button
                onClick={() => onOutcomeChange(vacancy.id, 'lost')}
                className={`px-2 py-1 rounded flex items-center gap-1 transition-colors min-h-[32px] ${
                  vacancy.outcome === 'lost'
                    ? 'bg-rose-900/60 text-rose-300 font-semibold'
                    : 'text-gray-400 hover:text-rose-400'
                }`}
              >
                <XCircle className="w-3 h-3" />
                <span>Отказ</span>
              </button>
            </div>
          )}

          {/* Details modal trigger */}
          <button
            onClick={() => onSelect(vacancy)}
            className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors min-h-[36px]"
          >
            Карточка
          </button>

          {/* Link to actual HH vacancy */}
          <a
            href={vacancy.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-rose-300 hover:text-rose-200 border border-gray-700 flex items-center justify-center gap-1.5 transition-colors min-h-[36px]"
          >
            <span>На HH.ru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
