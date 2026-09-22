import { Vacancy, DeveloperProfile } from '../types';

/**
 * Генерирует готовый структурированный промпт с полными данными вакансии с HH.ru
 * и контекстом резюме кандидата для отправки во внешние веб-чаты (ChatGPT, Claude, Gemini, DeepSeek).
 */
export function buildAiChatPrompt(vacancy: Vacancy, candidateProfile?: DeveloperProfile): string {
  const candidateInfo = candidateProfile
    ? `
👤 ПРОФИЛЬ И РЕЛЕВАНТНЫЙ ОПЫТ КАНДИДАТА:
• ФИО: ${candidateProfile.name}
• Позиция: ${candidateProfile.headline}
• Общий опыт: ${candidateProfile.totalExperience}
• Ключевой стек: ${candidateProfile.stack.slice(0, 18).join(', ')}
• Контакты для отклика: Telegram ${candidateProfile.telegram} | Телефон: ${candidateProfile.phone} | Email: ${candidateProfile.email}
• Портфолио: ${candidateProfile.portfolioUrl}
• GitHub: ${candidateProfile.github}
• Подтвержденные проекты из портфолио:
${candidateProfile.projects
  .slice(0, 3)
  .map(
    (p, idx) =>
      `  ${idx + 1}. «${p.title}» (${p.stack.slice(0, 5).join(', ')}):\n     ${p.description}`
  )
  .join('\n')}
`
    : '';

  const skillsList = (vacancy.keySkills && vacancy.keySkills.length > 0 ? vacancy.keySkills : vacancy.tags) || [];
  const skillsFormatted = skillsList.length > 0 ? skillsList.map((s) => `• ${s}`).join('\n') : '• Не указаны явно';

  const responsibilitiesFormatted =
    vacancy.responsibilities && vacancy.responsibilities.length > 0
      ? `\n🎯 ОСНОВНЫЕ ОБЯЗАННОСТИ И ЗАДАЧИ:\n${vacancy.responsibilities.map((r) => `• ${r}`).join('\n')}\n`
      : '';

  const requirementsFormatted =
    vacancy.requirements && vacancy.requirements.length > 0
      ? `\n🛠 ТРЕБОВАНИЯ К КАНДИДАТУ:\n${vacancy.requirements.map((r) => `• ${r}`).join('\n')}\n`
      : '';

  const conditionsFormatted =
    vacancy.conditions && vacancy.conditions.length > 0
      ? `\n🎁 ЧТО ПРЕДЛАГАЕТ КОМПАНИЯ (УСЛОВИЯ):\n${vacancy.conditions.map((c) => `• ${c}`).join('\n')}\n`
      : '';

  return `Ты — опытный Senior IT Recruiter и карьерный ментор.
Пожалуйста, внимательно проанализируй вакансию с HeadHunter (hh.ru) и составь сильный, персонализированный и живой отклик (сопроводительное письмо) на русском языке.

==================================================
📌 ДАННЫЕ ВАКАНСИИ С HH.RU:
==================================================
• Должность: ${vacancy.title}
• Компания: ${vacancy.employer}
• Формат и город: ${vacancy.city} (${vacancy.isRemote ? 'Удаленная работа' : 'Офис / Гибрид'}${
    vacancy.schedule ? `, ${vacancy.schedule}` : ''
  }${vacancy.employment ? `, ${vacancy.employment}` : ''})
• Уровень компенсации: ${vacancy.price}
• Требуемый опыт: ${vacancy.experienceRequirement || 'Не указан'}
• Ссылка на HeadHunter: ${vacancy.link}

🏷 КЛЮЧЕВЫЕ НАВЫКИ И СТЕК:
${skillsFormatted}
${responsibilitiesFormatted}${requirementsFormatted}${conditionsFormatted}
📝 ОПИСАНИЕ И КОНТЕКСТ ВАКАНСИИ:
${vacancy.description}
${candidateInfo}
==================================================
💡 ИНСТРУКЦИЯ ДЛЯ ГЕНЕРАЦИИ ОТКЛИКА:
==================================================
1. Выдели 2-3 ключевые технические боли или приоритетные задачи работодателя из текста вакансии.
2. Напиши лаконичный, убедительный отклик (до 1000–1200 знаков), ориентированный на результат.
3. СТРОГО ИСКЛЮЧИ шаблонные фразы («Меня крайне заинтересовала ваша вакансия», «Я коммуникабельный и стрессоустойчивый», «Ищу дружный коллектив»). Пиши по существу, как профессионал профессионалу.
4. Покажи, как практический стек кандидата и его реальные проекты прямо сейчас закрывают задачи этой вакансии.
5. Заверши письмо дружелюбным, открытым призывом к техническому созвону или обсуждению архитектуры.
6. Обязательно аккуратно укажи в подписи контакты, ссылку на GitHub и портфолио кандидата.`;
}

/**
 * Безопасное копирование текста в буфер обмена с fallback для разных окружений.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, falling back to textarea method:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text with fallback:', err);
    return false;
  }
}
