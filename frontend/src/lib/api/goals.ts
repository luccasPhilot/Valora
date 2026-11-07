import { z } from 'zod';

import { apiDelete, apiDeleteReturning, apiGet, apiPost, apiPut } from '../api-client';

// Contrato de /goals. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/goals/goals.routes.ts). A situação, o ritmo e o prazo chegam prontos.

const goalStatusSchema = z.enum(['completed', 'no_pace', 'on_track', 'behind']);

export const goalContributionSchema = z.object({
  id: z.uuid(),
  /** AAAA-MM-DD. */
  date: z.string(),
  /** Com sinal: negativo = retirada. */
  amountCents: z.int(),
  kind: z.enum(['initial', 'deposit', 'withdrawal']),
});

export const goalSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  icon: z.string(),
  targetCents: z.int(),
  savedCents: z.int(),
  /** AAAA-MM-DD. */
  targetDate: z.string().nullable(),
  /** Já arredondado para baixo e limitado a 100. */
  progressPercent: z.int(),
  status: goalStatusSchema,
  remainingCents: z.int(),
  /** Zero quando não há ritmo. */
  monthlyRateCents: z.int(),
  requiredMonthlyCents: z.int().nullable(),
  /** AAAA-MM-DD; nulo sem ritmo, com a meta concluída ou com a estimativa passando de 50 anos. */
  estimatedDate: z.string().nullable(),
  isEstimateTooFar: z.boolean(),
  recentContributions: z.array(goalContributionSchema),
});

const goalsSchema = z.object({ items: z.array(goalSchema) });

const contributionsPageSchema = z.object({
  items: z.array(goalContributionSchema),
  pagination: z.object({ page: z.int(), limit: z.int(), total: z.int() }),
});

export type Goal = z.infer<typeof goalSchema>;
export type GoalStatus = Goal['status'];
export type GoalContribution = z.infer<typeof goalContributionSchema>;
export type ContributionsPage = z.infer<typeof contributionsPageSchema>;

export interface GoalInput {
  readonly name: string;
  readonly icon: string;
  readonly targetCents: number;
  /** AAAA-MM-DD, ou nulo sem prazo. */
  readonly targetDate: string | null;
}

export interface NewGoalInput extends GoalInput {
  /** O que você já tinha guardado antes de usar o app; zero se nada. */
  readonly initialCents: number;
}

export interface ContributionInput {
  readonly type: 'deposit' | 'withdrawal';
  /** Sempre positivo: o `type` diz se entra ou sai. */
  readonly amountCents: number;
  /** AAAA-MM-DD, até hoje. */
  readonly date: string;
}

// Sem paginação: são poucas dezenas de metas; cada uma já traz os 10 aportes mais recentes.
export async function getGoals(): Promise<Goal[]> {
  return (await apiGet('/goals', goalsSchema)).items;
}

export function createGoal(input: NewGoalInput): Promise<Goal> {
  return apiPost('/goals', input, goalSchema);
}

export function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  return apiPut(`/goals/${id}`, input, goalSchema);
}

export function deleteGoal(id: string): Promise<void> {
  return apiDelete(`/goals/${id}`);
}

export function addGoalContribution(goalId: string, input: ContributionInput): Promise<Goal> {
  return apiPost(`/goals/${goalId}/contributions`, input, goalSchema);
}

export function removeGoalContribution(goalId: string, contributionId: string): Promise<Goal> {
  return apiDeleteReturning(`/goals/${goalId}/contributions/${contributionId}`, goalSchema);
}

export function getGoalContributions(
  goalId: string,
  page: number,
  limit: number,
): Promise<ContributionsPage> {
  return apiGet(
    `/goals/${goalId}/contributions?page=${page}&limit=${limit}`,
    contributionsPageSchema,
  );
}
