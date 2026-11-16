import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { monthRangeQuerySchema } from '../../shared/month-range.js';
import type { ReportsService } from './reports.service.js';

const monthLabelSchema = z.string().regex(/^\d{4}-\d{2}$/);

const incomeExpenseResponseSchema = z.object({
  from: monthLabelSchema,
  to: monthLabelSchema,
  months: z.array(
    z.object({
      month: monthLabelSchema,
      incomeCents: centsSchema,
      expenseCents: centsSchema,
      resultCents: centsSchema,
    }),
  ),
  totals: z.object({
    incomeCents: centsSchema,
    expenseCents: centsSchema,
    resultCents: centsSchema,
  }),
});

const categorySpendingResponseSchema = z.object({
  from: monthLabelSchema,
  to: monthLabelSchema,
  months: z.array(monthLabelSchema),
  series: z.array(
    z.object({
      kind: z.enum(['category', 'uncategorized', 'other']),
      categoryId: z.string().nullable(),
      name: z.string(),
      icon: z.string().nullable(),
      totalCents: centsSchema,
      percent: z.number(),
      monthlyCents: z.array(centsSchema),
    }),
  ),
  totals: z.object({
    totalCents: centsSchema,
    monthlyCents: z.array(centsSchema),
  }),
});

const savingsRatePercentSchema = z.number().nullable();

const savingsEvolutionResponseSchema = z.object({
  from: monthLabelSchema,
  to: monthLabelSchema,
  months: z.array(
    z.object({
      month: monthLabelSchema,
      incomeCents: centsSchema,
      expenseCents: centsSchema,
      resultCents: centsSchema,
      savingsRatePercent: savingsRatePercentSchema,
      cumulativeResultCents: centsSchema,
    }),
  ),
  totals: z.object({
    incomeCents: centsSchema,
    expenseCents: centsSchema,
    resultCents: centsSchema,
    savingsRatePercent: savingsRatePercentSchema,
    surplusMonths: z.int(),
    closedMonths: z.int(),
  }),
});

export function reportsRoutes(service: ReportsService): FastifyPluginAsyncZod {
  return async (app) => {
    // O schema de resposta é a lista branca do DTO: nada além destes campos sai.
    app.get(
      '/reports/income-expense',
      {
        schema: {
          querystring: monthRangeQuerySchema,
          response: { 200: incomeExpenseResponseSchema },
        },
      },
      async (request) => {
        const report = await service.incomeExpense(request.query);
        return { ...report, months: [...report.months] };
      },
    );

    app.get(
      '/reports/category-spending',
      {
        schema: {
          querystring: monthRangeQuerySchema,
          response: { 200: categorySpendingResponseSchema },
        },
      },
      async (request) => {
        const report = await service.categorySpending(request.query);
        return {
          ...report,
          months: [...report.months],
          series: report.series.map((item) => ({ ...item, monthlyCents: [...item.monthlyCents] })),
          totals: { ...report.totals, monthlyCents: [...report.totals.monthlyCents] },
        };
      },
    );

    app.get(
      '/reports/savings-evolution',
      {
        schema: {
          querystring: monthRangeQuerySchema,
          response: { 200: savingsEvolutionResponseSchema },
        },
      },
      async (request) => {
        const report = await service.savingsEvolution(request.query);
        return { ...report, months: [...report.months] };
      },
    );
  };
}
