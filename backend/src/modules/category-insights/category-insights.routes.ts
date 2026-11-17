import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { centsSchema } from '../../shared/money.js';
import { monthSchema } from '../../shared/month-schema.js';
import type { CategoryInsightsService } from './category-insights.service.js';

const monthLabelSchema = z.string().regex(/^\d{4}-\d{2}$/);
const percentSchema = z.number();
const nullablePercentSchema = z.number().nullable();

const categoryKindSchema = z.enum(['category', 'uncategorized']);

const changeSchema = z.object({
  kind: categoryKindSchema,
  categoryId: z.string().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  differenceCents: centsSchema,
});

const categorySchema = z.object({
  kind: categoryKindSchema,
  categoryId: z.string().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  spentCents: centsSchema,
  percent: percentSchema,
  previousSpentCents: centsSchema,
  variationPercent: nullablePercentSchema,
  budget: z
    .object({
      limitCents: centsSchema,
      percent: z.int(),
      status: z.enum(['ok', 'warning', 'exceeded']),
    })
    .nullable(),
  monthlyCents: z.array(centsSchema),
  averageCents: centsSchema.nullable(),
  peak: z.object({ month: monthLabelSchema, cents: centsSchema }),
});

const attentionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('budget_exceeded'),
    categoryId: z.string(),
    name: z.string(),
    limitCents: centsSchema,
    spentCents: centsSchema,
  }),
  z.object({
    type: z.literal('category_surge'),
    categoryId: z.string(),
    name: z.string(),
    differenceCents: centsSchema,
    variationPercent: percentSchema,
  }),
  z.object({
    type: z.literal('uncategorized_high'),
    spentCents: centsSchema,
    percent: percentSchema,
  }),
]);

const categoryInsightsResponseSchema = z.object({
  month: monthLabelSchema,
  previousMonth: monthLabelSchema,
  isInProgress: z.boolean(),
  totals: z.object({
    spentCents: centsSchema,
    previousSpentCents: centsSchema,
    variationPercent: nullablePercentSchema,
    comparedThroughDay: z.int().nullable(),
  }),
  months: z.array(monthLabelSchema),
  categories: z.array(categorySchema),
  changes: z.object({ increases: z.array(changeSchema), decreases: z.array(changeSchema) }),
  recurring: z.object({
    items: z.array(
      z.object({
        description: z.string(),
        amountCents: centsSchema,
        chargesCount: z.int(),
        lastChargeDate: z.string(),
      }),
    ),
    monthlyTotalCents: centsSchema,
    yearlyTotalCents: centsSchema,
  }),
  attention: z.array(attentionSchema),
});

const querySchema = z.object({ month: monthSchema.optional() });

export function categoryInsightsRoutes(service: CategoryInsightsService): FastifyPluginAsyncZod {
  return async (app) => {
    // O schema de resposta é a lista branca do DTO: nada além destes campos sai.
    app.get(
      '/category-insights',
      { schema: { querystring: querySchema, response: { 200: categoryInsightsResponseSchema } } },
      async (request) => {
        const insights = await service.analyze(request.query.month);
        return {
          ...insights,
          months: [...insights.months],
          categories: insights.categories.map((category) => ({
            ...category,
            monthlyCents: [...category.monthlyCents],
          })),
          changes: {
            increases: [...insights.changes.increases],
            decreases: [...insights.changes.decreases],
          },
          recurring: { ...insights.recurring, items: [...insights.recurring.items] },
          attention: [...insights.attention],
        };
      },
    );
  };
}
