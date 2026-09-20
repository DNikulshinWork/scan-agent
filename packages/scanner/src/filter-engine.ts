import { KeywordScoringRule } from '@scan-agent/shared-types';

export function evaluateVacancyByFilters(
  title: string,
  description: string,
  rules: KeywordScoringRule
): {
  score: number;
  matchPercentage: number;
  matchedKeywords: string[];
  verdict: string;
  isExcluded: boolean;
  stopWordFound?: string;
} {
  const text = `${title} ${description}`.toLowerCase();

  for (const stopWord of rules.hardExclude) {
    const escaped = stopWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zа-я0-9])${escaped}([^a-zа-я0-9]|$)`, 'i');
    if (regex.test(text)) {
      return {
        score: 0,
        matchPercentage: 0,
        matchedKeywords: [],
        verdict: `Отсеяно стоп-фильтром: найдено "${stopWord}".`,
        isExcluded: true,
        stopWordFound: stopWord,
      };
    }
  }

  const matchedKeywords: string[] = [];
  let rawScore = 0;

  for (const kw of rules.coreStack) {
    if (text.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      rawScore += 10;
    }
  }

  for (const kw of rules.relatedStack) {
    if (text.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      rawScore += 5;
    }
  }

  for (const kw of rules.niceToHave) {
    if (text.includes(kw.toLowerCase())) {
      matchedKeywords.push(kw);
      rawScore += 2;
    }
  }

  const maxPossible = 30;
  const scoreOutOf10 = Math.min(10, Math.max(1, Math.round((rawScore / maxPossible) * 10)));
  const matchPercentage = Math.min(100, Math.round((rawScore / maxPossible) * 100));

  const verdict =
    scoreOutOf10 >= 8
      ? `Отличное совпадение со стеком (${matchedKeywords.slice(0, 5).join(', ')}). Без стоп-слов.`
      : scoreOutOf10 >= 6
      ? `Хорошее совпадение (${matchedKeywords.slice(0, 4).join(', ')}).`
      : `Частичное совпадение (${matchedKeywords.join(', ') || 'базовый web'}).`;

  return {
    score: scoreOutOf10,
    matchPercentage,
    matchedKeywords,
    verdict,
    isExcluded: false,
  };
}
