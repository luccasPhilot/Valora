import { firstDayOfMonth, lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { isIncludedInTotalBalance } from '../accounts/account-totals.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { BudgetItem, BudgetsService } from '../budgets/budgets.service.js';
import type { TransactionRecord } from '../transactions/transactions.repository.js';
import type { TransactionsService } from '../transactions/transactions.service.js';
import type { BalancePoint, DashboardRepository, MonthTotals } from './dashboard.repository.js';
import {
  type BalanceChange,
  buildBalanceChange,
  buildSpendingBreakdown,
  fillMonthTotals,
  INCOME_VS_EXPENSE_MONTHS,
  monthsEndingAt,
  type SpendingItem,
} from './dashboard-calculations.js';

const BUDGETS_NEAR_LIMIT_COUNT = 3;
const LATEST_TRANSACTIONS_COUNT = 5;

export interface DashboardOverview {
  /** Dia 1 do mês. */
  readonly month: string;
  readonly totalBalanceCents: number;
  readonly balanceEvolution: readonly BalancePoint[];
  readonly balanceChange: BalanceChange | null;
  readonly monthIncomeCents: number;
  readonly monthExpenseCents: number;
  readonly incomeVsExpense: readonly MonthTotals[];
  readonly spendingByCategory: readonly SpendingItem[];
  readonly budgetsNearLimit: readonly BudgetItem[];
  readonly latestTransactions: readonly TransactionRecord[];
}

export interface DashboardServiceDependencies {
  readonly dashboard: DashboardRepository;
  readonly accounts: Pick<AccountsService, 'overview'>;
  readonly budgets: Pick<BudgetsService, 'overview'>;
  readonly transactions: Pick<TransactionsService, 'latest'>;
  readonly now: () => Date;
}

export class DashboardService {
  constructor(private readonly deps: DashboardServiceDependencies) {}

  /** `month` é o dia 1 do mês; sem ele, vale o mês atual no fuso de São Paulo. */
  async overview(month: string = this.currentMonth()): Promise<DashboardOverview> {
    const { accounts, totals } = await this.deps.accounts.overview();
    const balanceAccountIds = accounts.filter(isIncludedInTotalBalance).map(({ id }) => id);
    const [balanceEvolution, incomeVsExpense, spending, budgets, latestTransactions] =
      await Promise.all([
        this.deps.dashboard.findBalanceEvolution(balanceAccountIds, month, lastDayOfMonth(month)),
        this.findIncomeVsExpense(month),
        this.deps.dashboard.findCategorySpending(month, lastDayOfMonth(month)),
        this.deps.budgets.overview(month),
        this.deps.transactions.latest(LATEST_TRANSACTIONS_COUNT),
      ]);
    const requestedMonthTotals = incomeVsExpense.at(-1);
    return {
      month,
      totalBalanceCents: totals.totalBalanceCents,
      balanceEvolution,
      balanceChange: buildBalanceChange(
        totals.totalBalanceCents,
        balanceEvolution,
        todayInSaoPaulo(this.deps.now()),
      ),
      monthIncomeCents: requestedMonthTotals?.incomeCents ?? 0,
      monthExpenseCents: requestedMonthTotals?.expenseCents ?? 0,
      incomeVsExpense,
      spendingByCategory: buildSpendingBreakdown(spending),
      budgetsNearLimit: budgets.items.slice(0, BUDGETS_NEAR_LIMIT_COUNT),
      latestTransactions,
    };
  }

  private async findIncomeVsExpense(month: string): Promise<MonthTotals[]> {
    const months = monthsEndingAt(month, INCOME_VS_EXPENSE_MONTHS);
    const found = await this.deps.dashboard.findMonthTotals(
      months[0] ?? month,
      lastDayOfMonth(month),
    );
    return fillMonthTotals(months, found);
  }

  private currentMonth(): string {
    return firstDayOfMonth(todayInSaoPaulo(this.deps.now()));
  }
}
