import type { GoalItem } from '../goals/goals.service.js';
import type { ProjectionResult } from '../projection/projection.service.js';

export const GOALS_SUMMARY_COUNT = 3;

/** O resumo da projeção do fim do mês: os mesmos números da tela de Planejamento. */
export interface ProjectionSummary {
  readonly projectedBalanceCents: number;
  readonly lowestBalanceCents: number;
  readonly lowestBalanceDate: string;
  /** Há receita ou despesa prevista pendente, ou fatura no período. */
  readonly hasPlannedItems: boolean;
}

export interface GoalSummary {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly targetCents: number;
  readonly savedCents: number;
  readonly percent: number;
  readonly status: GoalItem['status'];
  readonly estimatedDate: string | null;
  readonly requiredMonthlyCents: number | null;
}

export interface GoalsSummary {
  readonly items: readonly GoalSummary[];
  /** Total de metas não concluídas (não só as que aparecem em `items`). */
  readonly activeCount: number;
}

export function summarizeProjection(projection: ProjectionResult): ProjectionSummary {
  return {
    projectedBalanceCents: projection.projectedBalanceCents,
    lowestBalanceCents: projection.lowestBalanceCents,
    lowestBalanceDate: projection.lowestBalanceDate,
    hasPlannedItems: projection.events.length > 0,
  };
}

/** `goals` vem na ordem da tela de Metas (concluídas no fim); as concluídas não entram no resumo. */
export function summarizeGoals(goals: readonly GoalItem[]): GoalsSummary {
  const activeGoals = goals.filter((goal) => goal.status !== 'completed');
  return {
    items: activeGoals.slice(0, GOALS_SUMMARY_COUNT).map(toGoalSummary),
    activeCount: activeGoals.length,
  };
}

function toGoalSummary(goal: GoalItem): GoalSummary {
  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    targetCents: goal.targetCents,
    savedCents: goal.savedCents,
    percent: goal.progressPercent,
    status: goal.status,
    estimatedDate: goal.estimatedDate,
    requiredMonthlyCents: goal.requiredMonthlyCents,
  };
}
