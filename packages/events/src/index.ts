import pkg from 'eventemitter2';
const EventEmitter2 = (pkg as any).EventEmitter2 || pkg;
import { Vacancy, VacancyStatus } from '@scan-agent/shared-types';

export enum EventType {
  VACANCY_DISCOVERED = 'vacancy.discovered',
  VACANCY_FILTER_PASSED = 'vacancy.filter.passed',
  VACANCY_FILTER_REJECTED = 'vacancy.filter.rejected',
  VACANCY_STATUS_CHANGED = 'vacancy.status.changed',
}

export interface VacancyFilterResultPayload {
  vacancy: Vacancy;
  passed: boolean;
  score: number;
  matchedKeywords: string[];
  stopWordFound?: string;
}

export interface VacancyStatusChangedPayload {
  vacancyId: string;
  oldStatus?: VacancyStatus;
  newStatus: VacancyStatus;
}

export const appEventBus = new EventEmitter2({
  wildcard: true,
  delimiter: '.',
  maxListeners: 50,
});
