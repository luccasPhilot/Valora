import { z } from 'zod';

import { apiGet } from '../api-client';
import { budgetSchema } from './budgets';
import { goalStatusSchema } from './goals';
import { transactionSchema } from './transactions';

// Contrato de /dashboard. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/dashboard/dashboard.routes.ts). Tudo já chega calculado: o front só mostra.

const spendingItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('category'),
    categoryId: z.uuid(),
    name: z.string(),
    icon: z.string(),
    amountCents: z.int(),
    /** Parte do gasto líquido total do mês, já arredondada, só para exibir. */
    percent: z.int(),
  }),
  z.object({
    kind: z.enum(['uncategorized', 'other']),
    name: z.string(),
    amountCents: z.int(),
    percent: z.int(),
  }),
]);

const monthTotalsSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  incomeCents: z.int(),
  /** Positivo: é o quanto saiu. */
  expenseCents: z.int(),
});

const projectionSummarySchema = z.object({
  projectedBalanceCents: z.int(),
  lowestBalanceCents: z.int(),
  /** AAAA-MM-DD. */
  lowestBalanceDate: z.iso.date(),
  /** Falso quando não há nada previsto nem fatura no período. */
  hasPlannedItems: z.boolean(),
});

const goalSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  icon: z.string(),
  targetCents: z.int(),
  savedCents: z.int(),
  /** Já arredondado para baixo e limitado a 100. */
  percent: z.int(),
  status: goalStatusSchema,
  /** AAAA-MM-DD; nulo sem ritmo, com a meta concluída ou com a estimativa passando de 50 anos. */
  estimatedDate: z.string().nullable(),
  requiredMonthlyCents: z.int().nullable(),
});

const dashboardSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  totalBalanceCents: z.int(),
  balanceEvolution: z.array(z.object({ date: z.iso.date(), balanceCents: z.int() })),
  /** Nulo sem uma foto de saldo anterior a hoje no mês. */
  balanceChange: z.object({ cents: z.int(), percent: z.number().nullable() }).nullable(),
  monthIncomeCents: z.int(),
  monthExpenseCents: z.int(),
  /** Os 6 meses até o pedido, do mais antigo ao mais recente. */
  incomeVsExpense: z.array(monthTotalsSchema),
  spendingByCategory: z.array(spendingItemSchema),
  budgetsNearLimit: z.array(budgetSchema),
  latestTransactions: z.array(transactionSchema),
  /** Nulo fora do mês atual: nesse caso o cartão não aparece. */
  projection: projectionSummarySchema.nullable(),
  /** Até 3 metas não concluídas, na ordem da tela de Metas, e o total das não concluídas. */
  goals: z.object({ items: z.array(goalSummarySchema), activeCount: z.int() }),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type BalancePoint = Dashboard['balanceEvolution'][number];
export type MonthTotals = Dashboard['incomeVsExpense'][number];
export type SpendingItem = Dashboard['spendingByCategory'][number];
export type DashboardProjection = NonNullable<Dashboard['projection']>;
export type DashboardGoal = Dashboard['goals']['items'][number];

/** Sem `month`, a API usa o mês atual. */
export function getDashboard(): Promise<Dashboard> {
  return apiGet('/dashboard', dashboardSchema);
}
