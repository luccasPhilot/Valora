import { addMonthsKeepingDay } from '../../shared/dates.js';
import type { GoalPaceEstimate } from './goal-pace.js';

export type GoalStatus = 'completed' | 'no_pace' | 'on_track' | 'behind';

const MONTHS_PER_YEAR = 12;
const MIN_MONTHS_TO_DEADLINE = 1;

export interface StatusGoal {
  readonly savedCents: number;
  readonly targetCents: number;
  readonly targetDate: string | null;
}

export interface GoalSituation {
  readonly status: GoalStatus;
  readonly remainingCents: number;
  /** Quanto guardar por mês para chegar no prazo; nulo sem prazo ou com a meta concluída. */
  readonly requiredMonthlyCents: number | null;
}

// Menor número de meses cheios (a partir de hoje) que alcança o prazo.
function monthsUntil(today: string, targetDate: string): number {
  const calendarMonths =
    (Number(targetDate.slice(0, 4)) - Number(today.slice(0, 4))) * MONTHS_PER_YEAR +
    Number(targetDate.slice(5, 7)) -
    Number(today.slice(5, 7));
  return addMonthsKeepingDay(today, calendarMonths) < targetDate
    ? calendarMonths + 1
    : calendarMonths;
}

function requiredMonthlyCents(remainingCents: number, today: string, targetDate: string): number {
  const months = Math.max(MIN_MONTHS_TO_DEADLINE, monthsUntil(today, targetDate));
  return Math.ceil(remainingCents / months);
}

function pendingStatus(
  targetDate: string | null,
  pace: GoalPaceEstimate,
  today: string,
): Exclude<GoalStatus, 'completed'> {
  if (targetDate !== null && targetDate < today) return 'behind';
  if (pace.monthlyRateCents === 0) return 'no_pace';
  if (targetDate === null) return 'on_track';
  return pace.estimatedDate !== null && pace.estimatedDate <= targetDate ? 'on_track' : 'behind';
}

/** Situação da meta frente ao ritmo e ao prazo. Concluída vale qualquer que seja o prazo. */
export function goalStatus(goal: StatusGoal, pace: GoalPaceEstimate, today: string): GoalSituation {
  const remainingCents = Math.max(0, goal.targetCents - goal.savedCents);
  if (remainingCents === 0) {
    return { status: 'completed', remainingCents, requiredMonthlyCents: null };
  }
  return {
    status: pendingStatus(goal.targetDate, pace, today),
    remainingCents,
    requiredMonthlyCents:
      goal.targetDate === null
        ? null
        : requiredMonthlyCents(remainingCents, today, goal.targetDate),
  };
}
