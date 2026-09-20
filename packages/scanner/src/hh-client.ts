import { appEventBus, EventType } from '@scan-agent/events';
import { KeywordScoringRule, Vacancy } from '@scan-agent/shared-types';
import { evaluateVacancyByFilters } from './filter-engine.js';
import { generateCoverLetter } from './pitch-generator.js';

export async function runHhScannerJob(rules: KeywordScoringRule): Promise<Vacancy[]> {
  const url = `https://api.hh.ru/vacancies?text=${encodeURIComponent(
    'TypeScript OR React OR Node.js OR Fastify'
  )}&schedule=remote&per_page=50&order_by=publication_time`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ScanAgent/1.0 (d.nikulshin.work@gmail.com)' },
  });

  if (!res.ok) throw new Error(`HH API returned ${res.status}`);
  const data = await res.json();
  const validVacancies: Vacancy[] = [];

  for (const item of data.items || []) {
    const title = item.name || '';
    const desc = item.snippet?.requirement || item.snippet?.responsibility || '';
    const evaluation = evaluateVacancyByFilters(title, desc, rules);

    let price = 'Не указана';
    let salaryNum: number | null = null;
    if (item.salary) {
      const from = item.salary.from;
      const to = item.salary.to;
      const cur = item.salary.currency === 'RUR' ? '₽' : item.salary.currency;
      if (from && to) price = `${from.toLocaleString('ru-RU')} – ${to.toLocaleString('ru-RU')} ${cur}`;
      else if (from) price = `от ${from.toLocaleString('ru-RU')} ${cur}`;
      else if (to) price = `до ${to.toLocaleString('ru-RU')} ${cur}`;
      salaryNum = from || to || null;
    }

    const { hook, pitch } = generateCoverLetter(title, evaluation.matchedKeywords);

    const vacancy: Vacancy = {
      id: `hh-${item.id}`,
      orderId: String(item.id),
      source: 'hh',
      title,
      description: `${desc}\nУсловия: ${item.schedule?.name || 'Удаленно'}`,
      price,
      salaryNum,
      link: item.alternate_url || `https://hh.ru/vacancy/${item.id}`,
      employer: item.employer?.name || 'Компания',
      city: item.area?.name || 'Удаленно',
      isRemote: item.schedule?.id === 'remote',
      score: evaluation.score,
      matchPercentage: evaluation.matchPercentage,
      matchedKeywords: evaluation.matchedKeywords,
      filterVerdict: evaluation.verdict,
      hook,
      pitch,
      tags: evaluation.matchedKeywords.length > 0 ? evaluation.matchedKeywords : ['TypeScript', 'Node.js'],
      status: 'new',
      outcome: 'pending',
      publishedAt: item.published_at || new Date().toISOString(),
    };

    if (evaluation.isExcluded) {
      appEventBus.emit(EventType.VACANCY_FILTER_REJECTED, { vacancy, reason: evaluation.stopWordFound });
    } else if (evaluation.score >= rules.minScore) {
      validVacancies.push(vacancy);
      appEventBus.emit(EventType.VACANCY_FILTER_PASSED, { vacancy, score: evaluation.score });
    }
  }

  return validVacancies;
}
