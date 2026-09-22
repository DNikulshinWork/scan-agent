export type VacancyStatus = 'new' | 'applied' | 'skipped';
export type VacancyOutcome = 'pending' | 'won' | 'lost';

export interface Vacancy {
  id: string;
  orderId: string;
  source: 'hh';
  title: string;
  description: string;
  price: string;
  salaryNum?: number | null;
  link: string;
  employer: string;
  city: string;
  isRemote: boolean;
  score: number; // 0-10 (расчитан по правилам фильтрации стека)
  keywordScore: number;
  matchPercentage: number; // 0-100% соответствие фильтрам
  matchedKeywords: string[];
  missingKeywords?: string[];
  filterVerdict: string; // Обоснование вердикта фильтра
  reason?: string;
  hook: string;
  pitch: string;
  tags: string[];
  status: VacancyStatus;
  outcome: VacancyOutcome;
  publishedAt: string;
  processedAt: string;
  appliedAt?: string | null;
  experienceRequirement?: string;
  schedule?: string;
  employment?: string;
  keySkills?: string[];
  responsibilities?: string[];
  requirements?: string[];
  conditions?: string[];
  salaryGross?: boolean;
}

export interface FilterState {
  status: 'all' | VacancyStatus;
  minScore: number;
  searchQuery: string;
  selectedTag: string;
  remoteOnly: boolean;
  minSalary: number;
  experienceLevel?: 'all' | 'noExperience' | 'between1And3' | 'between3And6' | 'moreThan6';
}

export interface StatsData {
  totalParsed: number;
  totalFilteredOut: number;
  totalPassedFilters: number;
  totalApplied: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  avgMatchScore: number;
}

export interface DeveloperProject {
  title: string;
  category: 'Fullstack' | 'AI / Automation' | 'Infra';
  githubRepo?: string;
  stack: string[];
  description: string;
}

export interface DeveloperProfile {
  name: string;
  age: number;
  location: string;
  phone: string;
  email: string;
  telegram: string;
  github: string;
  portfolioUrl: string;
  maxProfile: string;
  headline: string;
  totalExperience: string;
  stack: string[];
  projects: DeveloperProject[];
  strengths: string[];
  typicalTimeline: string;
  communicationStyle: string;
  hhResumeRawText: string;
}

export interface KeywordScoringRule {
  core: string[];
  related: string[];
  nice: string[];
  hardExclude: string[];
  minScore: number;
  minSalaryFilter: number;
}
