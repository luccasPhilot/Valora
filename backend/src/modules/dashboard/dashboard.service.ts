import { firstDayOfMonth, lastDayOfMonth, todayInSaoPaulo } from '../../shared/dates.js';
import { monthsEndingAt } from '../../shared/months.js';
import { buildValueChange, type ValueChange } from '../../shared/value-change.js';
import { isIncludedInTotalBalance } from '../accounts/account-totals.js';
import type { AccountsService } from '../accounts/accounts.service.js';
import type { BudgetItem, BudgetsService } from '../budgets/budgets.service.js';
import type { GoalsService } from '../goals/goals.service.js';
import type { NetWorthService } from '../net-worth/net-worth.service.js';
import type { ProjectionService } from '../projection/projection.service.js';
import type { TransactionRecord } from '../transactions/transactions.repository.js';
import type { TransactionsService } from '../transactions/transactions.service.js';
import type { BalancePoint, DashboardRepository, MonthTotals } from './dashboard.repository.js';
import {
  buildSpendingBreakdown,
  fillMonthTotals,
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
  readonly dashboard: DashboardRepository;
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
    const { accounts, totals } = await this.deps.accounts.overview();
    const balanceAccountIds = accounts.filter(isIncludedInTotalBalance).map(({ id }) => id);
    const [
      activeBalanceEvolution,
      balanceEvolution,
      incomeVsExpense,
      spending,
      budgets,
      latestTransactions,
      projection,
      goals,
      netWorth,
    ] = await Promise.all([
      // A variação do mês usa só os bancos ativos; o gráfico soma também o passado dos arquivados.
      this.deps.dashboard.findBalanceEvolution(balanceAccountIds, month, lastDayOfMonth(month)),
      this.deps.dashboard.findBalanceEvolutionWithArchived(
        balanceAccountIds,
        month,
        lastDayOfMonth(month),
      ),
      this.findIncomeVsExpense(month),
      this.deps.dashboard.findCategorySpending(month, lastDayOfMonth(month)),
      this.deps.budgets.overview(month),
      this.deps.transactions.latest(LATEST_TRANSACTIONS_COUNT),
      this.findProjection(month),
      this.deps.goals.list(),
      this.findNetWorth(month),
    ]);
    const requestedMonthTotals = incomeVsExpense.at(-1);
    const [firstActivePoint] = activeBalanceEvolution;
    return {
      month,
      totalBalanceCents: totals.totalBalanceCents,
      balanceEvolution,
      balanceChange: buildValueChange(
        totals.totalBalanceCents,
        firstActivePoint && { date: firstActivePoint.date, cents: firstActivePoint.balanceCents },
        todayInSaoPaulo(this.deps.now()),
      ),
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
