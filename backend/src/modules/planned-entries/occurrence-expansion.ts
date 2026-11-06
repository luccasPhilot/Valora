import { dayInMonth } from '../../shared/dates.js';

export type Recurrence = 'none' | 'monthly' | 'yearly';

const MONTH_NUMBER_START = 5;
const MONTH_NUMBER_END = 7;

/** O que decide em quais meses uma previsão acontece. Meses são o dia 1 (AAAA-MM-01). */
export interface RecurringEntry {
  readonly recurrence: Recurrence;
  readonly dayOfMonth: number;
  readonly startMonth: string;
  /** Nulo = sem fim. */
  readonly endMonth: string | null;
  readonly isActive: boolean;
}

function monthNumberOf(month: string): string {
  return month.slice(MONTH_NUMBER_START, MONTH_NUMBER_END);
}

function isWithinPeriod(entry: RecurringEntry, month: string): boolean {
  if (month < entry.startMonth) return false;
  return entry.endMonth === null || month <= entry.endMonth;
}

function happensIn(entry: RecurringEntry, month: string): boolean {
  if (!entry.isActive || !isWithinPeriod(entry, month)) return false;
  if (entry.recurrence === 'monthly') return true;
  if (entry.recurrence === 'yearly')
    return monthNumberOf(month) === monthNumberOf(entry.startMonth);
  return month === entry.startMonth;
}

/**
 * Datas previstas da previsão no mês (`month` é o dia 1). Hoje há no máximo uma por mês; a lista
 * deixa a regra pronta para outras repetições. Previsão pausada nunca acontece. O dia é limitado
 * ao último dia do mês (dia 31 em fevereiro cai no 28 ou 29).
 */
export function expandOccurrences(entry: RecurringEntry, month: string): string[] {
  return happensIn(entry, month) ? [dayInMonth(month, entry.dayOfMonth)] : [];
}
