import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Send,
  ListChecks,
  Briefcase,
  Gift,
  Code2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Vacancy, VacancyStatus, VacancyOutcome, DeveloperProfile } from '../types';
import { initialProfile } from '../data/mockData';
import { buildAiChatPrompt, copyTextToClipboard } from '../utils/aiPromptGenerator';

interface VacancyDetailsModalProps {
  vacancy: Vacancy | null;
  profile?: DeveloperProfile;
  onClose: () => void;
  onUpdatePitch: (id: string, newPitch: string) => void;
  onStatusChange?: (id: string, newStatus: VacancyStatus) => void;
  onOutcomeChange?: (id: string, newOutcome: VacancyOutcome) => void;
}

export const VacancyDetailsModal: React.FC<VacancyDetailsModalProps> = ({
  vacancy,
  profile = initialProfile,
  onClose,
  onUpdatePitch,
  onStatusChange,
  onOutcomeChange,
}) => {
  if (!vacancy) return null;

  const [pitchText, setPitchText] = useState(vacancy.pitch);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const aiPrompt = buildAiChatPrompt(vacancy, profile);

  const handleCopyPitch = () => {
    const fullText = vacancy.hook ? `${vacancy.hook}\n\n${pitchText}` : pitchText;
    copyTextToClipboard(fullText);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyAiPrompt = async () => {
    const success = await copyTextToClipboard(aiPrompt);
    if (success) {
      setCopiedAiPrompt(true);
      setTimeout(() => setCopiedAiPrompt(false), 2500);
    }
  };

  const handleSavePitch = () => {
    onUpdatePitch(vacancy.id, pitchText);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const skillsList = (vacancy.keySkills && vacancy.keySkills.length > 0 ? vacancy.keySkills : vacancy.tags) || [];

  return (
    <div
      id="vacancy-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="vacancy-details-modal-container"
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-start justify-between gap-4 bg-gray-950/80">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-600/20 text-red-300 border border-red-500/30">
                HH.ru ID: {vacancy.orderId}
              </span>
              <span className="text-sm font-bold text-emerald-400">
                💰 {vacancy.price}
                {vacancy.salaryGross !== undefined && (
                  <span className="text-xs font-normal text-gray-400 ml-1">
                    {vacancy.salaryGross ? '(до вычета налогов)' : '(на руки)'}
                  </span>
                )}
              </span>
              {vacancy.experienceRequirement && (
                <span className="px-2 py-0.5 text-xs rounded bg-gray-800 text-gray-300 border border-gray-700">
                  Опыт: {vacancy.experienceRequirement}
                </span>
              )}
              {vacancy.employment && (
                <span className="px-2 py-0.5 text-xs rounded bg-gray-800/60 text-gray-400 border border-gray-700/60">
                  {vacancy.employment}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {vacancy.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-0.5">
              <span className="flex items-center gap-1 text-gray-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                {vacancy.employer}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                {vacancy.city} {vacancy.isRemote && '(Удаленно)'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Опубликовано: {new Date(vacancy.publishedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-gray-200">
          {/* SECTION 1: AI Prompt Generator & External Chat Launcher (USER'S MAIN REQUEST) */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-gray-900 border border-rose-800/50 space-y-3.5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-sm text-white">
                    Промпт для внешнего ИИ-чата (ChatGPT / Claude / DeepSeek / Gemini)
                  </span>
                </div>
                <p className="text-xs text-gray-300">
                  Автоматически объединяет все требования вакансии с HH.ru и ваш профиль для глубокого анализа и написания отклика.
                </p>
              </div>

              {/* Copy prompt button */}
              <button
                id="btn-modal-copy-ai-prompt"
                onClick={handleCopyAiPrompt}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shrink-0 ${
                  copiedAiPrompt
                    ? 'bg-emerald-600 text-white border border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/50 shadow-rose-900/40'
                }`}
              >
                {copiedAiPrompt ? (
                  <>
                    <Check className="w-4 h-4 text-white animate-bounce" />
                    <span>Промпт скопирован в буфер!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Скопировать промпт для ИИ</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Web Chat Launchers */}
            <div className="pt-2 border-t border-rose-900/40 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-400 text-[11px] font-medium mr-1">Быстрый переход в веб-чат:</span>
              <a
                href="https://chatgpt.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 transition-colors"
              >
                <span>ChatGPT</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors"
              >
                <span>Claude</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://chat.deepseek.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-sky-400 border border-sky-500/30 flex items-center gap-1 transition-colors"
              >
                <span>DeepSeek</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://gemini.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-blue-400 border border-blue-500/30 flex items-center gap-1 transition-colors"
              >
                <span>Gemini</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Prompt preview toggle */}
              <button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="ml-auto text-gray-400 hover:text-gray-200 text-[11px] flex items-center gap-1"
              >
                <span>{showPromptPreview ? 'Скрыть текст промпта' : 'Посмотреть промпт'}</span>
                {showPromptPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Collapsible Prompt Preview */}
            {showPromptPreview && (
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-xs font-mono text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {aiPrompt}
              </div>
            )}
          </div>

          {/* SECTION 2: Filter Matching Score Bar */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 to-slate-900/40 border border-rose-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rose-300 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                Оценка фильтрами стека (Детерминированная)
              </span>
              <div className="flex items-center gap-2">
                {vacancy.matchPercentage ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                    {vacancy.matchPercentage}% совпадение
                  </span>
                ) : null}
                <span className="text-base font-bold text-white bg-rose-600/40 px-2.5 py-0.5 rounded-lg border border-rose-500/40">
                  {vacancy.score} / 10
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {vacancy.filterVerdict || vacancy.reason}
            </p>
          </div>

          {/* SECTION 3: Key Skills from HH.ru */}
          {skillsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Ключевые навыки с HeadHunter</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-950 text-gray-200 border border-gray-800 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: Structured HH.ru Info (Responsibilities, Requirements, Conditions) */}
          {(vacancy.responsibilities || vacancy.requirements || vacancy.conditions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Responsibilities */}
              {vacancy.responsibilities && vacancy.responsibilities.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Обязанности и задачи</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                    {vacancy.responsibilities.map((r, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {vacancy.requirements && vacancy.requirements.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>Требования к кандидату</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                    {vacancy.requirements.map((req, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conditions */}
              {vacancy.conditions && vacancy.conditions.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 space-y-2 md:col-span-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Условия и бенефиты</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                    {vacancy.conditions.map((cond, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {cond}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Raw HH Job Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Описание вакансии с HeadHunter
            </h4>
            <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 text-xs sm:text-sm text-gray-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {vacancy.description}
            </div>
          </div>

          {/* SECTION 6: Local Cover Letter / Pitch Editor */}
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Локальный отклик (Cover Letter)
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePitch}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/40 transition-colors"
                >
                  {isSaved ? 'Сохранено!' : 'Сохранить правки'}
                </button>
              </div>
            </div>

            {vacancy.hook && (
              <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs italic text-rose-200">
                <span className="font-semibold text-gray-500 not-italic mr-1">Hook:</span>
                {vacancy.hook}
              </div>
            )}

            <textarea
              rows={5}
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-xs sm:text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-rose-500 font-mono leading-relaxed"
              placeholder="Текст сопроводительного письма..."
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <a
            href={vacancy.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center justify-center sm:justify-start gap-1.5 py-1"
          >
            <span>Перейти к вакансии на HH.ru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Secondary: Copy Local Pitch */}
            <button
              onClick={handleCopyPitch}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors border border-gray-700 min-h-[40px]"
            >
              {copiedPitch ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Отклик скопирован!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                  <span>Скопировать отклик</span>
                </>
              )}
            </button>

            {/* Primary: Copy AI Prompt for Web Chat */}
            <button
              onClick={handleCopyAiPrompt}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-900/30 min-h-[40px]"
            >
              {copiedAiPrompt ? (
                <>
                  <Check className="w-4 h-4 text-white animate-bounce" />
                  <span>Промпт для ИИ скопирован!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-rose-200" />
                  <span>Скопировать для ИИ-чата</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
