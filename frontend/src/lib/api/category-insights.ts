import { z } from 'zod';

import { apiGet } from '../api-client';

// Contrato de /category-insights. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/category-insights/category-insights.routes.ts). Tudo chega calculado.

const monthSchema = z.string();
const categoryKindSchema = z.enum(['category', 'uncategorized']);

const categoryInsightSchema = z.object({
  /** "Sem categoria" não é uma categoria de verdade: não tem id nem ícone. */
  kind: categoryKindSchema,
  categoryId: z.string().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  spentCents: z.int(),
  /** Fatia do gasto do mês, com uma casa decimal (38,5 = 38,5%). */
  percent: z.number(),
  previousSpentCents: z.int(),
  /** Nulo quando o período de comparação não teve gasto na categoria ("Novo"). */
  variationPercent: z.number().nullable(),
  budget: z
    .object({
      limitCents: z.int(),
      percent: z.int(),
      status: z.enum(['ok', 'warning', 'exceeded']),
    })
    .nullable(),
  /** Um valor por mês de `months`, na mesma ordem. */
  monthlyCents: z.array(z.int()),
  /** Média dos meses anteriores ao pedido; nulo quando não há nenhum. */
  averageCents: z.int().nullable(),
  peak: z.object({ month: monthSchema, cents: z.int() }),
});

const categoryChangeSchema = z.object({
  kind: categoryKindSchema,
  categoryId: z.string().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  /** Positivo em `increases`, negativo em `decreases`. */
  differenceCents: z.int(),
});

const attentionPointSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('budget_exceeded'),
    categoryId: z.string(),
    name: z.string(),
    limitCents: z.int(),
    spentCents: z.int(),
  }),
  z.object({
    type: z.literal('category_surge'),
    categoryId: z.string(),
    name: z.string(),
    differenceCents: z.int(),
    variationPercent: z.number(),
  }),
  z.object({
    type: z.literal('uncategorized_high'),
    spentCents: z.int(),
    percent: z.number(),
  }),
]);

const categoryInsightsSchema = z.object({
  /** AAAA-MM. */
  month: monthSchema,
  previousMonth: monthSchema,
  /** Verdadeiro no mês atual: a comparação é com o mesmo trecho do mês anterior. */
  isInProgress: z.boolean(),
  totals: z.object({
    spentCents: z.int(),
    previousSpentCents: z.int(),
    variationPercent: z.number().nullable(),
    /** Dia até o qual o mês anterior foi comparado; nulo no mês encerrado. */
    comparedThroughDay: z.int().nullable(),
  }),
  /** Do mais antigo ao mais recente; o último é `month`. */
  months: z.array(monthSchema),
  categories: z.array(categoryInsightSchema),
  changes: z.object({
    increases: z.array(categoryChangeSchema),
    decreases: z.array(categoryChangeSchema),
  }),
  recurring: z.object({
    items: z.array(
      z.object({
        description: z.string(),
        amountCents: z.int(),
        chargesCount: z.int(),
        lastChargeDate: z.string(),
      }),
    ),
    monthlyTotalCents: z.int(),
    yearlyTotalCents: z.int(),
  }),
  attention: z.array(attentionPointSchema),
});

export type CategoryInsight = z.infer<typeof categoryInsightSchema>;
export type CategoryChange = z.infer<typeof categoryChangeSchema>;
export type AttentionPoint = z.infer<typeof attentionPointSchema>;
export type CategoryInsights = z.infer<typeof categoryInsightsSchema>;
export type RecurringCharge = CategoryInsights['recurring']['items'][number];

/** `month` é `AAAA-MM`. */
export function getCategoryInsights(month: string): Promise<CategoryInsights> {
  return apiGet(`/category-insights?month=${month}`, categoryInsightsSchema);
}
