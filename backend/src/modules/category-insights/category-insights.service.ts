import {
  addMonthsKeepingDay,
  firstDayOfMonth,
  firstDayOfPreviousMonth,
  lastDayOfMonth,
  todayInSaoPaulo,
} from '../../shared/dates.js';
import { ValidationError } from '../../shared/errors.js';
import { monthsEndingAt } from '../../shared/months.js';
import type { AlertChargesRepository } from '../alerts/alert-charges.repository.js';
import { PATTERN_LOOKBACK_MONTHS } from '../alerts/detectors/charge-row.js';
import { findActiveSubscriptions } from '../alerts/detectors/subscriptions.js';
import type { BudgetsRepository } from '../budgets/budgets.repository.js';
import { listReportMonths } from '../reports/reports-calculations.js';
import type { TransactionTotalsRepository } from '../transactions/transaction-totals.repository.js';
import {
  type AttentionPoint,
  buildAttention,
  buildChanges,
  type CategoryChanges,
} from './category-changes.js';
import {
  buildDifferences,
  buildItems,
  buildTotals,
  type CategoryInsightItem,
  type InsightTotals,
} from './category-insights-calculations.js';

export const TREND_MONTHS = 6;
const MONTHS_PER_YEAR = 12;

export interface RecurringCharge {
  /** Descrição da cobrança mais recente. */
  readonly description: string;
  /** Positivo. */
  readonly amountCents: number;
  readonly chargesCount: number;
  readonly lastChargeDate: string;
}

export interface RecurringCharges {
  readonly items: readonly RecurringCharge[];
  readonly monthlyTotalCents: number;
  readonly yearlyTotalCents: number;
}

export interface CategoryInsights {
  /** `AAAA-MM`. */
  readonly month: string;
  readonly previousMonth: string;
  readonly isInProgress: boolean;
  readonly totals: InsightTotals & {
    /** Dia até o qual o mês anterior foi comparado; nulo quando a comparação é com o mês anterior inteiro. */
    readonly comparedThroughDay: number | null;
  };
  /** `AAAA-MM`, do mais antigo ao mais recente; o último é `month`. */
  readonly months: readonly string[];
  readonly categories: readonly CategoryInsightItem[];
  readonly changes: CategoryChanges;
  readonly recurring: RecurringCharges;
  readonly attention: readonly AttentionPoint[];
}

export interface CategoryInsightsServiceDependencies {
  readonly totals: Pick<
    TransactionTotalsRepository,
    'findCategorySpending' | 'findCategorySpendingByMonth' | 'findFirstTransactionDay'
  >;
  readonly budgets: Pick<BudgetsRepository, 'findForMonth'>;
  readonly charges: Pick<AlertChargesRepository, 'findOutflowsSince'>;
  readonly now: () => Date;
}

interface ComparisonPeriod {
  readonly from: string;
  readonly to: string;
  readonly comparedThroughDay: number | null;
}

/**
 * Mês encerrado: o mês anterior inteiro. Mês em andamento: o mesmo trecho do mês anterior (dia 1 até
 * hoje, limitado ao último dia dele), para o gasto parcial não parecer uma queda.
 */
function comparisonPeriodOf(monthStart: string, today: string): ComparisonPeriod {
  const previousStart = firstDayOfPreviousMonth(monthStart);
  const previousEnd = lastDayOfMonth(previousStart);
  if (firstDayOfMonth(today) !== monthStart) {
    return { from: previousStart, to: previousEnd, comparedThroughDay: null };
  }
  const comparedThroughDay = Math.min(Number(today.slice(8, 10)), Number(previousEnd.slice(8, 10)));
  const to = `${previousStart.slice(0, 8)}${String(comparedThroughDay).padStart(2, '0')}`;
  return { from: previousStart, to, comparedThroughDay };
}

export class CategoryInsightsService {
  constructor(private readonly deps: CategoryInsightsServiceDependencies) {}

  /** `month` é o dia 1 do mês pedido; sem ele, vale o mês atual no fuso de São Paulo. */
  async analyze(month?: string): Promise<CategoryInsights> {
    const today = todayInSaoPaulo(this.deps.now());
    const monthStart = this.resolveMonth(month, today);
    const comparison = comparisonPeriodOf(monthStart, today);
    const monthRange = await this.findMonthRange(monthStart);
    const [rows, previous, budgets, recurring] = await Promise.all([
      this.deps.totals.findCategorySpendingByMonth(monthRange.from, lastDayOfMonth(monthStart)),
      this.deps.totals.findCategorySpending(comparison.from, comparison.to),
      this.deps.budgets.findForMonth(monthStart),
      this.findRecurring(today),
    ]);
    const current = rows.filter((row) => row.month === monthStart.slice(0, 7));
    const differences = buildDifferences(current, previous);
    const totals = buildTotals(current, previous);
    const categories = buildItems({
      differences,
      rows,
      months: monthRange.months,
      limitsByCategoryId: new Map(budgets.map((budget) => [budget.categoryId, budget.limitCents])),
    });
    return {
      month: monthStart.slice(0, 7),
      previousMonth: comparison.from.slice(0, 7),
      isInProgress: firstDayOfMonth(today) === monthStart,
      totals: { ...totals, comparedThroughDay: comparison.comparedThroughDay },
      months: monthRange.months,
      categories,
      changes: buildChanges(differences),
      recurring,
      attention: buildAttention(categories, differences, totals.spentCents),
    };
  }

  private resolveMonth(month: string | undefined, today: string): string {
    const currentMonth = firstDayOfMonth(today);
    if (month === undefined) return currentMonth;
    if (month > currentMonth) {
      throw new ValidationError(
        `O mês ${month.slice(0, 7)} é posterior ao mês atual ${currentMonth.slice(0, 7)}`,
        { details: [{ field: 'month', message: 'Informe o mês atual ou um mês anterior' }] },
      );
    }
    return month;
  }

  /** Até 6 meses terminando no pedido, começando na primeira transação guardada se ela for mais recente. */
  private async findMonthRange(
    monthStart: string,
  ): Promise<{ from: string; months: readonly string[] }> {
    const firstTransactionDay = await this.deps.totals.findFirstTransactionDay();
    const from = monthsEndingAt(monthStart, TREND_MONTHS)[0] ?? monthStart;
    const listed = listReportMonths({ from, to: monthStart }, firstTransactionDay);
    const months = listed.length > 0 ? listed : [monthStart];
    return { from: months[0] ?? monthStart, months: months.map((month) => month.slice(0, 7)) };
  }

  private async findRecurring(today: string): Promise<RecurringCharges> {
    const rows = await this.deps.charges.findOutflowsSince(
      addMonthsKeepingDay(today, -PATTERN_LOOKBACK_MONTHS),
    );
    const items = findActiveSubscriptions(rows, today)
      .map((subscription) => ({
        description: subscription.latestCharge.description.trim(),
        amountCents: subscription.amountCents,
        chargesCount: subscription.chargesCount,
        lastChargeDate: subscription.latestCharge.date,
      }))
      .sort(
        (first, second) =>
          second.amountCents - first.amountCents ||
          first.description.localeCompare(second.description, 'pt-BR'),
      );
    const monthlyTotalCents = items.reduce((sum, item) => sum + item.amountCents, 0);
    return { items, monthlyTotalCents, yearlyTotalCents: monthlyTotalCents * MONTHS_PER_YEAR };
  }
}
