import { daysBetween, todayInSaoPaulo, toSaoPauloDate } from '../../shared/dates.js';

/** Dias de calendário, em São Paulo, de hoje até o vencimento do consentimento (0 = vence hoje). */
export function consentDaysLeft(expiresAt: Date, now: Date): number {
  return daysBetween(todayInSaoPaulo(now), toSaoPauloDate(expiresAt));
}
