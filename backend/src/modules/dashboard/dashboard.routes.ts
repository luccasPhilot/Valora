import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { monthSchema } from '../../shared/month-schema.js';
import { budgetItemSchema, toBudgetItemResponse } from '../budgets/budgets.routes.js';
import {
  toTransactionResponse,
  transactionResponseSchema,
} from '../transactions/transactions.routes.js';
import type { DashboardService } from './dashboard.service.js';

const querySchema = z.object({ month: monthSchema.optional() });

const spendingItemSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('category'),
    categoryId: z.uuid(),
    name: z.string(),
    icon: z.string(),
    amountCents: centsSchema,
    percent: z.int(),
  }),
  z.object({
    kind: z.enum(['uncategorized', 'other']),
    name: z.string(),
    amountCents: centsSchema,
    percent: z.int(),
  }),
]);

const projectionSummarySchema = z.object({
  projectedBalanceCents: centsSchema,
  lowestBalanceCents: centsSchema,
  lowestBalanceDate: z.iso.date(),
  hasPlannedItems: z.boolean(),
});

const netWorthSummarySchema = z.object({
  totalCents: centsSchema,
  investmentsCents: centsSchema,
  openBillsCents: centsSchema,
  change: z.object({ cents: centsSchema, percent: z.number().nullable() }).nullable(),
});

const goalsSummarySchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      icon: z.string(),
      targetCents: centsSchema,
      savedCents: centsSchema,
      percent: z.int(),
      status: z.enum(['completed', 'no_pace', 'on_track', 'behind']),
      estimatedDate: z.iso.date().nullable(),
      requiredMonthlyCents: centsSchema.nullable(),
    }),
  ),
  activeCount: z.int(),
});

const dashboardResponseSchema = z.object({
  month: z.string(),
  totalBalanceCents: centsSchema,
  balanceEvolution: z.array(z.object({ date: z.iso.date(), balanceCents: centsSchema })),
  balanceChange: z.object({ cents: centsSchema, percent: z.number().nullable() }).nullable(),
  netWorth: netWorthSummarySchema.nullable(),
  monthIncomeCents: centsSchema,
  monthExpenseCents: centsSchema,
  incomeVsExpense: z.array(
    z.object({ month: z.string(), incomeCents: centsSchema, expenseCents: centsSchema }),
  ),
  spendingByCategory: z.array(spendingItemSchema),
  budgetsNearLimit: z.array(budgetItemSchema),
  latestTransactions: z.array(transactionResponseSchema),
  projection: projectionSummarySchema.nullable(),
  goals: goalsSummarySchema,
});

export function dashboardRoutes(service: DashboardService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/dashboard',
      { schema: { querystring: querySchema, response: { 200: dashboardResponseSchema } } },
      async (request) => {
        const overview = await service.overview(request.query.month);
        return {
          month: overview.month.slice(0, 7),
          totalBalanceCents: overview.totalBalanceCents,
          balanceEvolution: [...overview.balanceEvolution],
          balanceChange: overview.balanceChange,
          netWorth: overview.netWorth,
          monthIncomeCents: overview.monthIncomeCents,
          monthExpenseCents: overview.monthExpenseCents,
          incomeVsExpense: [...overview.incomeVsExpense],
          spendingByCategory: [...overview.spendingByCategory],
          budgetsNearLimit: overview.budgetsNearLimit.map(toBudgetItemResponse),
          latestTransactions: overview.latestTransactions.map(toTransactionResponse),
          projection: overview.projection,
          goals: { ...overview.goals, items: [...overview.goals.items] },
        };
      },
    );
  };
}
