import { lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { ValidationError } from '../../shared/errors.js';
import { type MonthRangeQuery, parseMonthRange } from '../../shared/month-range.js';
import { fillMonthTotals } from '../../shared/months.js';
import type { TagsRepository } from '../tags/tags.repository.js';
import type { TransactionTotalsRepository } from '../transactions/transaction-totals.repository.js';
import { buildCategoryReport, type CategoryReport } from './category-spending-report.js';
import {
  buildIncomeExpenseReport,
  type IncomeExpenseReport,
  listReportMonths,
} from './reports-calculations.js';
import { buildSavingsReport, type SavingsReport } from './savings-evolution-report.js';

export interface IncomeExpenseOverview extends IncomeExpenseReport {
  /** Período pedido (`AAAA-MM`), já com os padrões aplicados. */
  readonly from: string;
  readonly to: string;
}

export interface CategorySpendingOverview extends CategoryReport {
  /** Período pedido (`AAAA-MM`), já com os padrões aplicados. */
  readonly from: string;
  readonly to: string;
}

export interface SavingsEvolutionOverview extends SavingsReport {
  /** Período pedido (`AAAA-MM`), já com os padrões aplicados. */
  readonly from: string;
  readonly to: string;
}

/** Receitas e despesas e gasto por categoria aceitam `tagId`; a evolução da poupança não. */
export interface TaggedMonthRangeQuery extends MonthRangeQuery {
  readonly tagId?: string;
}

export interface ReportsServiceDependencies {
  readonly tags: Pick<TagsRepository, 'findExistingIds'>;
  readonly totals: Pick<
    TransactionTotalsRepository,
    'findMonthTotals' | 'findFirstTransactionDay' | 'findCategorySpendingByMonth'
  >;
  readonly now: () => Date;
}

export class ReportsService {
  constructor(private readonly deps: ReportsServiceDependencies) {}

  async incomeExpense(query: TaggedMonthRangeQuery): Promise<IncomeExpenseOverview> {
    const range = parseMonthRange(query, todayInSaoPaulo(this.deps.now()));
    await this.assertTagExists(query.tagId);
    const [found, firstTransactionDay] = await Promise.all([
      this.deps.totals.findMonthTotals(range.from, lastDayOfMonth(range.to), query.tagId),
      this.deps.totals.findFirstTransactionDay(),
    ]);
    return {
      from: range.from.slice(0, 7),
      to: range.to.slice(0, 7),
      ...buildIncomeExpenseReport(found, range, firstTransactionDay),
    };
  }

  async categorySpending(query: TaggedMonthRangeQuery): Promise<CategorySpendingOverview> {
    const range = parseMonthRange(query, todayInSaoPaulo(this.deps.now()));
    await this.assertTagExists(query.tagId);
    const [found, firstTransactionDay] = await Promise.all([
      this.deps.totals.findCategorySpendingByMonth(
        range.from,
        lastDayOfMonth(range.to),
        query.tagId,
      ),
      this.deps.totals.findFirstTransactionDay(),
    ]);
    const months = listReportMonths(range, firstTransactionDay).map((month) => month.slice(0, 7));
    return {
      from: range.from.slice(0, 7),
      to: range.to.slice(0, 7),
      ...buildCategoryReport(found, months),
    };
  }

  private async assertTagExists(tagId: string | undefined): Promise<void> {
    if (tagId === undefined) return;
    const [existingId] = await this.deps.tags.findExistingIds([tagId]);
    if (existingId) return;
    throw new ValidationError(`Etiqueta ${tagId} não existe`, {
      details: [{ field: 'tagId', message: 'A etiqueta não existe' }],
    });
  }

  async savingsEvolution(query: MonthRangeQuery): Promise<SavingsEvolutionOverview> {
    const today = todayInSaoPaulo(this.deps.now());
    const range = parseMonthRange(query, today);
    const [found, firstTransactionDay] = await Promise.all([
      this.deps.totals.findMonthTotals(range.from, lastDayOfMonth(range.to)),
      this.deps.totals.findFirstTransactionDay(),
    ]);
    const months = fillMonthTotals(listReportMonths(range, firstTransactionDay), found);
    return {
      from: range.from.slice(0, 7),
      to: range.to.slice(0, 7),
      ...buildSavingsReport(months, today),
    };
  }
}
