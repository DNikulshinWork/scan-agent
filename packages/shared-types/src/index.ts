export type VacancyStatus = 'all' | 'new' | 'applied' | 'skipped';
export type VacancyOutcome = 'pending' | 'won' | 'lost';

export interface Vacancy {
  id: string;
  orderId: string;
  source: 'hh';
  title: string;
  description: string;
  price: string;
  salaryNum: number | null;
  link: string;
  employer: string;
  city: string;
  isRemote: boolean;
  score: number;
  matchPercentage: number;
  matchedKeywords: string[];
  missingKeywords?: string[];
  filterVerdict: string;
  hook: string;
  pitch: string;
  tags: string[];
  status: VacancyStatus;
  outcome: VacancyOutcome;
  publishedAt: string;
  processedAt?: string;
  appliedAt?: string | null;
  experienceRequirement?: string;
  schedule?: string;
}

export interface DeveloperProfile {
  name: string;
  headline: string;
  phone: string;
  email: string;
  telegram: string;
  github: string;
  portfolioUrl: string;
  stack: string[];
}

export interface KeywordScoringRule {
  coreStack: string[];
  relatedStack: string[];
  niceToHave: string[];
  hardExclude: string[];
  minScore: number;
}
