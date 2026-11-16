import { addMonthsKeepingDay, daysBetween, subtractDays } from '../../shared/dates.js';

export type ContributionKind = 'initial' | 'deposit' | 'withdrawal';

export const PACE_WINDOW_DAYS = 90;
export const MIN_PACE_WINDOW_DAYS = 30;
export const MAX_ESTIMATE_MONTHS = 600;
const DAYS_PER_MONTH = 30;

export interface PaceGoal {
  readonly savedCents: number;
  readonly targetCents: number;
  /** Dia em que a meta foi criada (AAAA-MM-DD, São Paulo). */
  readonly createdDate: string;
}

export interface PaceContribution {
  readonly date: string;
  /** Com sinal: negativo = retirada. */
  readonly amountCents: number;
  readonly kind: ContributionKind;
}

export interface GoalPaceEstimate {
  /** Zero quando não há ritmo (sem aportes, ou retiradas que anulam os aportes). */
  readonly monthlyRateCents: number;
  readonly windowDays: number;
  readonly monthsToGo: number | null;
  readonly estimatedDate: string | null;
  /** A estimativa passou do teto de {@link MAX_ESTIMATE_MONTHS} meses e por isso não traz data. */
  readonly isEstimateTooFar: boolean;
}

// Meta nova usa a idade dela (mínimo 30 dias) para o primeiro aporte não ser diluído em 90 dias.
function paceWindowDays(createdDate: string, today: string): number {
  const ageDays = daysBetween(createdDate, today);
  return Math.min(PACE_WINDOW_DAYS, Math.max(MIN_PACE_WINDOW_DAYS, ageDays));
}

// O valor inicial é o que já existia antes do app, então não é ritmo.
function monthlyRateCents(
  contributions: readonly PaceContribution[],
  windowDays: number,
  today: string,
): number {
  const windowStart = subtractDays(today, windowDays);
  const netCents = contributions
    .filter(({ kind, date }) => kind !== 'initial' && date > windowStart && date <= today)
    .reduce((sum, { amountCents }) => sum + amountCents, 0);
  return Math.max(0, Math.floor((netCents * DAYS_PER_MONTH) / windowDays));
}

/** Ritmo = média mensal líquida (aportes − retiradas, sem o valor inicial) da janela, e o prazo que ele leva. */
export function estimateGoalPace(
  goal: PaceGoal,
  contributions: readonly PaceContribution[],
  today: string,
): GoalPaceEstimate {
  const windowDays = paceWindowDays(goal.createdDate, today);
  const rateCents = monthlyRateCents(contributions, windowDays, today);
  const remainingCents = Math.max(0, goal.targetCents - goal.savedCents);
  return estimateFromRate(remainingCents, { monthlyRateCents: rateCents, windowDays }, today);
}

export interface PaceRate {
  readonly monthlyRateCents: number;
  readonly windowDays: number;
}

/** Prazo e data para guardar `remainingCents` no ritmo dado, com o teto de {@link MAX_ESTIMATE_MONTHS} meses. */
export function estimateFromRate(
  remainingCents: number,
  rate: PaceRate,
  today: string,
): GoalPaceEstimate {
  const base = { monthlyRateCents: rate.monthlyRateCents, windowDays: rate.windowDays };
  if (remainingCents === 0 || rate.monthlyRateCents === 0) {
    return { ...base, monthsToGo: null, estimatedDate: null, isEstimateTooFar: false };
  }
  const monthsToGo = Math.ceil(remainingCents / rate.monthlyRateCents);
  if (monthsToGo > MAX_ESTIMATE_MONTHS) {
    return { ...base, monthsToGo: null, estimatedDate: null, isEstimateTooFar: true };
  }
  const estimatedDate = addMonthsKeepingDay(today, monthsToGo);
  return { ...base, monthsToGo, estimatedDate, isEstimateTooFar: false };
}
