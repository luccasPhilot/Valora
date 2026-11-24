import {
  firstDayOfMonth,
  lastDayOfMonth,
  subtractDays,
  todayInSaoPaulo,
} from '../../shared/dates.js';
import { fillMonthTotals, monthsEndingAt, type MonthTotals } from '../../shared/months.js';
import type { ValueChange } from '../../shared/value-change.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { BudgetItem, BudgetsService } from '../budgets/budgets.service.js';
import type { GoalsService } from '../goals/goals.service.js';
import type { NetWorthRepository } from '../net-worth/net-worth.repository.js';
import type { NetWorthService } from '../net-worth/net-worth.service.js';
import {
  type BalancePoint,
  buildAccountsMonthChange,
  buildBalanceSeries,
  groupSnapshotRows,
  SNAPSHOT_TOLERANCE_DAYS,
} from '../net-worth/net-worth-calculations.js';
import type { ProjectionService } from '../projection/projection.service.js';
import type { TransactionTotalsRepository } from '../transactions/transaction-totals.repository.js';
import type { TransactionRecord } from '../transactions/transactions.repository.js';
import type { TransactionsService } from '../transactions/transactions.service.js';
import {
  buildSpendingBreakdown,
  INCOME_VS_EXPENSE_MONTHS,
  type SpendingItem,
} from './dashboard-calculations.js';
import {
  type GoalsSummary,
  type NetWorthBlock,
  type ProjectionSummary,
  summarizeGoals,
  summarizeNetWorth,
  summarizeProjection,
} from './dashboard-planning.js';

const BUDGETS_NEAR_LIMIT_COUNT = 3;
const LATEST_TRANSACTIONS_COUNT = 5;

export interface DashboardOverview {
  /** Dia 1 do mês. */
  readonly month: string;
  readonly totalBalanceCents: number;
  readonly balanceEvolution: readonly BalancePoint[];
  readonly balanceChange: ValueChange | null;
  /** Só existe para o mês atual: a variação "desde o começo do mês" não faz sentido nos outros. */
  readonly netWorth: NetWorthBlock | null;
  readonly monthIncomeCents: number;
  readonly monthExpenseCents: number;
  readonly incomeVsExpense: readonly MonthTotals[];
  readonly spendingByCategory: readonly SpendingItem[];
  readonly budgetsNearLimit: readonly BudgetItem[];
  readonly latestTransactions: readonly TransactionRecord[];
  /** Só existe para o mês atual: para os outros meses a projeção não faz sentido. */
  readonly projection: ProjectionSummary | null;
  readonly goals: GoalsSummary;
}

export interface DashboardServiceDependencies {
  readonly snapshots: Pick<NetWorthRepository, 'findAccountSnapshots'>;
  readonly totals: Pick<TransactionTotalsRepository, 'findMonthTotals' | 'findCategorySpending'>;
  readonly accounts: Pick<AccountsService, 'overview'>;
  readonly budgets: Pick<BudgetsService, 'overview'>;
  readonly transactions: Pick<TransactionsService, 'latest'>;
  readonly projection: Pick<ProjectionService, 'projection'>;
  readonly goals: Pick<GoalsService, 'list'>;
  readonly netWorth: Pick<NetWorthService, 'summary'>;
  readonly now: () => Date;
}

export class DashboardService {
  constructor(private readonly deps: DashboardServiceDependencies) {}

  /** `month` é o dia 1 do mês; sem ele, vale o mês atual no fuso de São Paulo. */
  async overview(month: string = this.currentMonth()): Promise<DashboardOverview> {
    const today = todayInSaoPaulo(this.deps.now());
    const [
      { totals },
      snapshotRows,
      incomeVsExpense,
      spending,
      budgets,
      latestTransactions,
      projection,
      goals,
      netWorth,
    ] = await Promise.all([
      this.deps.accounts.overview(),
      // Os 7 dias antes do mês deixam a tolerância alcançar a foto do mês anterior.
      this.deps.snapshots.findAccountSnapshots(
        subtractDays(month, SNAPSHOT_TOLERANCE_DAYS),
        lastDayOfMonth(month),
      ),
      this.findIncomeVsExpense(month),
      this.deps.totals.findCategorySpending(month, lastDayOfMonth(month)),
      this.deps.budgets.overview(month),
      this.deps.transactions.latest(LATEST_TRANSACTIONS_COUNT),
      this.findProjection(month),
      this.deps.goals.list(),
      this.findNetWorth(month),
    ]);
    const requestedMonthTotals = incomeVsExpense.at(-1);
    const snapshotItems = groupSnapshotRows(snapshotRows);
    return {
      month,
      totalBalanceCents: totals.totalBalanceCents,
      balanceEvolution: buildBalanceSeries(snapshotItems, month),
      // "Desde o começo do mês" só faz sentido no mês atual: num mês passado compararia com hoje.
      balanceChange:
        month === firstDayOfMonth(today)
          ? buildAccountsMonthChange(snapshotItems, totals.totalBalanceCents, today)
          : null,
      netWorth,
      monthIncomeCents: requestedMonthTotals?.incomeCents ?? 0,
      monthExpenseCents: requestedMonthTotals?.expenseCents ?? 0,
      incomeVsExpense,
      spendingByCategory: buildSpendingBreakdown(spending),
      budgetsNearLimit: budgets.items.slice(0, BUDGETS_NEAR_LIMIT_COUNT),
      latestTransactions,
      projection,
      goals: summarizeGoals(goals),
    };
  }

  private async findProjection(month: string): Promise<ProjectionSummary | null> {
    if (month !== this.currentMonth()) return null;
    return summarizeProjection(await this.deps.projection.projection());
  }

  private async findNetWorth(month: string): Promise<NetWorthBlock | null> {
    if (month !== this.currentMonth()) return null;
    return summarizeNetWorth(await this.deps.netWorth.summary());
  }

  private async findIncomeVsExpense(month: string): Promise<MonthTotals[]> {
    const months = monthsEndingAt(month, INCOME_VS_EXPENSE_MONTHS);
    const found = await this.deps.totals.findMonthTotals(months[0] ?? month, lastDayOfMonth(month));
    return fillMonthTotals(months, found);
  }

  private currentMonth(): string {
    return firstDayOfMonth(todayInSaoPaulo(this.deps.now()));
  }
}
