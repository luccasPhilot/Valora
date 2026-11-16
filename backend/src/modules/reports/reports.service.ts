import { lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { type MonthRangeQuery, parseMonthRange } from '../../shared/month-range.js';
import { fillMonthTotals } from '../../shared/months.js';
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

export interface ReportsServiceDependencies {
  readonly totals: Pick<
    TransactionTotalsRepository,
    'findMonthTotals' | 'findFirstTransactionDay' | 'findCategorySpendingByMonth'
  >;
  readonly now: () => Date;
}

export class ReportsService {
  constructor(private readonly deps: ReportsServiceDependencies) {}

  async incomeExpense(query: MonthRangeQuery): Promise<IncomeExpenseOverview> {
    const range = parseMonthRange(query, todayInSaoPaulo(this.deps.now()));
    const [found, firstTransactionDay] = await Promise.all([
      this.deps.totals.findMonthTotals(range.from, lastDayOfMonth(range.to)),
      this.deps.totals.findFirstTransactionDay(),
    ]);
    return {
      from: range.from.slice(0, 7),
      to: range.to.slice(0, 7),
      ...buildIncomeExpenseReport(found, range, firstTransactionDay),
    };
  }

  async categorySpending(query: MonthRangeQuery): Promise<CategorySpendingOverview> {
    const range = parseMonthRange(query, todayInSaoPaulo(this.deps.now()));
    const [found, firstTransactionDay] = await Promise.all([
      this.deps.totals.findCategorySpendingByMonth(range.from, lastDayOfMonth(range.to)),
      this.deps.totals.findFirstTransactionDay(),
    ]);
    const months = listReportMonths(range, firstTransactionDay).map((month) => month.slice(0, 7));
    return {
      from: range.from.slice(0, 7),
      to: range.to.slice(0, 7),
      ...buildCategoryReport(found, months),
    };
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
