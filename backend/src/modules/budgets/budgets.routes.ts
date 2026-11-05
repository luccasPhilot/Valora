import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { monthSchema } from '../../shared/month-schema.js';
import type { BudgetItem, BudgetsService } from './budgets.service.js';

const monthQuerySchema = z.object({ month: monthSchema.optional() });
const requiredMonthQuerySchema = z.object({ month: monthSchema });
const categoryParamsSchema = z.object({ categoryId: z.uuid() });
const limitBodySchema = z.object({
  limitCents: centsSchema.positive({ error: 'O limite deve ser maior que zero' }),
});

export const budgetItemSchema = z.object({
  categoryId: z.uuid(),
  categoryName: z.string(),
  categoryIcon: z.string(),
  limitCents: centsSchema,
  spentCents: centsSchema,
  percent: z.int(),
  status: z.enum(['ok', 'warning', 'exceeded']),
});

const overviewResponseSchema = z.object({
  month: z.string(),
  items: z.array(budgetItemSchema),
  totals: z.object({ limitCents: centsSchema, spentCents: centsSchema }),
});

const copyResponseSchema = z.object({ copied: z.int() });

export function toBudgetItemResponse(item: BudgetItem): z.infer<typeof budgetItemSchema> {
  return {
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryIcon: item.categoryIcon,
    limitCents: item.limitCents,
    spentCents: item.spentCents,
    percent: item.percent,
    status: item.status,
  };
}

export function budgetsRoutes(service: BudgetsService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/budgets',
      { schema: { querystring: monthQuerySchema, response: { 200: overviewResponseSchema } } },
      async (request) => {
        const overview = await service.overview(request.query.month);
        return {
          month: overview.month.slice(0, 7),
          items: overview.items.map(toBudgetItemResponse),
          totals: overview.totals,
        };
      },
    );

    app.put(
      '/budgets/:categoryId',
      {
        schema: {
          params: categoryParamsSchema,
          querystring: requiredMonthQuerySchema,
          body: limitBodySchema,
          response: { 200: budgetItemSchema },
        },
      },
      async (request) =>
        toBudgetItemResponse(
          await service.setLimit(
            request.params.categoryId,
            request.query.month,
            request.body.limitCents,
          ),
        ),
    );

    app.delete(
      '/budgets/:categoryId',
      { schema: { params: categoryParamsSchema, querystring: requiredMonthQuerySchema } },
      async (request, reply) => {
        await service.removeLimit(request.params.categoryId, request.query.month);
        return reply.status(204).send();
      },
    );

    app.post(
      '/budgets/copy-previous',
      { schema: { querystring: requiredMonthQuerySchema, response: { 200: copyResponseSchema } } },
      async (request) => ({ copied: await service.copyFromPreviousMonth(request.query.month) }),
    );
  };
}
