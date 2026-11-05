import { z } from 'zod';

import { apiDelete, apiGet, apiPost, apiPut } from '../api-client';

// Contrato de /budgets. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/budgets/budgets.routes.ts). O status chega pronto: o front não recalcula.

const budgetStatusSchema = z.enum(['ok', 'warning', 'exceeded']);

const budgetSchema = z.object({
  categoryId: z.uuid(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  limitCents: z.int(),
  spentCents: z.int(),
  /** Já arredondado para baixo, só para exibir. */
  percent: z.int(),
  status: budgetStatusSchema,
});

const budgetsOverviewSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  items: z.array(budgetSchema),
  totals: z.object({ limitCents: z.int(), spentCents: z.int() }),
});

const copyResultSchema = z.object({ copied: z.int() });

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetStatus = Budget['status'];
export type BudgetsOverview = z.infer<typeof budgetsOverviewSchema>;

// Sem paginação: um limite por categoria de despesa, são poucos.
export function getBudgets(month: string): Promise<BudgetsOverview> {
  return apiGet(`/budgets?month=${month}`, budgetsOverviewSchema);
}

export function setBudgetLimit(
  categoryId: string,
  month: string,
  limitCents: number,
): Promise<Budget> {
  return apiPut(`/budgets/${categoryId}?month=${month}`, { limitCents }, budgetSchema);
}

export function removeBudgetLimit(categoryId: string, month: string): Promise<void> {
  return apiDelete(`/budgets/${categoryId}?month=${month}`);
}

/** Devolve quantos limites foram copiados do mês anterior. */
export async function copyPreviousBudgets(month: string): Promise<number> {
  const result = await apiPost(
    `/budgets/copy-previous?month=${month}`,
    undefined,
    copyResultSchema,
  );
  return result.copied;
}
