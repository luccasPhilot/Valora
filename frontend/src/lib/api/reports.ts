import { z } from 'zod';

import { apiGet } from '../api-client';

// Contrato de /reports/income-expense. O backend é o dono; estes schemas são a cópia do front
// (backend/src/modules/reports/reports.routes.ts). Tudo já chega calculado: o front só mostra.

const incomeExpenseMonthSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  incomeCents: z.int(),
  /** Positivo: a tela mostra com `−`. */
  expenseCents: z.int(),
  /** Receitas menos despesas; negativo quando as despesas passam das receitas. */
  resultCents: z.int(),
});

const incomeExpenseReportSchema = z.object({
  /** AAAA-MM do período pedido. */
  from: z.string(),
  to: z.string(),
  /** Do mês mais antigo ao mais recente; começa na primeira transação guardada. Vazio sem transações. */
  months: z.array(incomeExpenseMonthSchema),
  totals: z.object({
    incomeCents: z.int(),
    expenseCents: z.int(),
    resultCents: z.int(),
  }),
});

export type IncomeExpenseMonth = z.infer<typeof incomeExpenseMonthSchema>;
export type IncomeExpenseReport = z.infer<typeof incomeExpenseReportSchema>;

/** `from` e `to` são meses no formato `AAAA-MM`. */
export function getIncomeExpenseReport(from: string, to: string): Promise<IncomeExpenseReport> {
  return apiGet(`/reports/income-expense?from=${from}&to=${to}`, incomeExpenseReportSchema);
}

// Contrato de /reports/category-spending (backend/src/modules/reports/reports.routes.ts).

const categorySeriesSchema = z.object({
  /** "Sem categoria" e "Outros" não são categorias de verdade: não têm id nem ícone. */
  kind: z.enum(['category', 'uncategorized', 'other']),
  categoryId: z.string().nullable(),
  name: z.string(),
  icon: z.string().nullable(),
  totalCents: z.int(),
  /** Fatia do total do período, com uma casa decimal (38,5 = 38,5%). */
  percent: z.number(),
  /** Um valor por mês de `months`, na mesma ordem. */
  monthlyCents: z.array(z.int()),
});

const categorySpendingReportSchema = z.object({
  /** AAAA-MM do período pedido. */
  from: z.string(),
  to: z.string(),
  /** Do mês mais antigo ao mais recente (AAAA-MM); começa na primeira transação guardada. */
  months: z.array(z.string()),
  /** As 5 maiores categorias do período, da maior para a menor, e "Outros" por último quando há. */
  series: z.array(categorySeriesSchema),
  totals: z.object({
    totalCents: z.int(),
    monthlyCents: z.array(z.int()),
  }),
});

export type CategorySeries = z.infer<typeof categorySeriesSchema>;
export type CategorySpendingReport = z.infer<typeof categorySpendingReportSchema>;

/** `from` e `to` são meses no formato `AAAA-MM`. */
export function getCategorySpendingReport(
  from: string,
  to: string,
): Promise<CategorySpendingReport> {
  return apiGet(`/reports/category-spending?from=${from}&to=${to}`, categorySpendingReportSchema);
}

// Contrato de /reports/savings-evolution (backend/src/modules/reports/reports.routes.ts).

const savingsMonthSchema = z.object({
  /** AAAA-MM. */
  month: z.string(),
  incomeCents: z.int(),
  /** Positivo: a tela mostra com `−`. */
  expenseCents: z.int(),
  /** Receitas menos despesas; negativo quando as despesas passam das receitas. */
  resultCents: z.int(),
  /** Resultado ÷ receitas, em % com uma casa decimal (12,5 = 12,5%); nulo quando o mês não tem receita. */
  savingsRatePercent: z.number().nullable(),
  /** Soma dos resultados desde o primeiro mês da lista. Não é saldo nem patrimônio. */
  cumulativeResultCents: z.int(),
});

const savingsEvolutionReportSchema = z.object({
  /** AAAA-MM do período pedido. */
  from: z.string(),
  to: z.string(),
  /** Do mês mais antigo ao mais recente; começa na primeira transação guardada. Vazio sem transações. */
  months: z.array(savingsMonthSchema),
  totals: z.object({
    incomeCents: z.int(),
    expenseCents: z.int(),
    resultCents: z.int(),
    /** Soma dos resultados ÷ soma das receitas; nulo sem receita no período. */
    savingsRatePercent: z.number().nullable(),
    /** Meses fechados (anteriores ao atual) com resultado maior que zero. */
    surplusMonths: z.int(),
    closedMonths: z.int(),
  }),
});

export type SavingsMonth = z.infer<typeof savingsMonthSchema>;
export type SavingsEvolutionReport = z.infer<typeof savingsEvolutionReportSchema>;

/** `from` e `to` são meses no formato `AAAA-MM`. */
export function getSavingsEvolutionReport(
  from: string,
  to: string,
): Promise<SavingsEvolutionReport> {
  return apiGet(`/reports/savings-evolution?from=${from}&to=${to}`, savingsEvolutionReportSchema);
}
