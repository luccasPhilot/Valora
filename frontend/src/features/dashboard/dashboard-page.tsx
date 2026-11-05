import { ErrorState } from '@/components/states/error-state';
import { useLatestSyncRun } from '@/hooks/use-sync';
import type { Dashboard } from '@/lib/api/dashboard';

import { BalanceCard } from './balance-card';
import { BudgetsNearLimit } from './budgets-near-limit';
import { DASHBOARD_GRID_CLASSES, DashboardCell } from './dashboard-grid';
import { useDashboard } from './dashboard-queries';
import { DashboardSkeleton, FirstUseState } from './dashboard-states';
import { IncomeExpenseChart } from './income-expense-chart';
import { LatestTransactions } from './latest-transactions';
import { MonthSummary } from './month-summary';
import { Shortcuts } from './shortcuts';
import { SpendingByCategory } from './spending-by-category';

/** Os blocos na ordem do celular (Design System, "Dashboard"); sem saudação. */
function DashboardContent({ dashboard }: { dashboard: Dashboard }) {
  return (
    <div className={DASHBOARD_GRID_CLASSES}>
      <DashboardCell area="balance">
        <BalanceCard dashboard={dashboard} />
      </DashboardCell>
      <DashboardCell area="shortcuts">
        <Shortcuts />
      </DashboardCell>
      <DashboardCell area="month">
        <MonthSummary
          incomeCents={dashboard.monthIncomeCents}
          expenseCents={dashboard.monthExpenseCents}
        />
      </DashboardCell>
      <DashboardCell area="chart">
        <IncomeExpenseChart months={dashboard.incomeVsExpense} />
      </DashboardCell>
      <DashboardCell area="categories">
        <SpendingByCategory items={dashboard.spendingByCategory} month={dashboard.month} />
      </DashboardCell>
      <DashboardCell area="budgets">
        <BudgetsNearLimit budgets={dashboard.budgetsNearLimit} />
      </DashboardCell>
      <DashboardCell area="transactions">
        <LatestTransactions transactions={dashboard.latestTransactions} />
      </DashboardCell>
    </div>
  );
}

export function Component() {
  const dashboardQuery = useDashboard();
  const latestSyncRunQuery = useLatestSyncRun();

  if (latestSyncRunQuery.isSuccess && latestSyncRunQuery.data === null) return <FirstUseState />;
  if (dashboardQuery.isPending || latestSyncRunQuery.isPending) return <DashboardSkeleton />;
  if (dashboardQuery.isError) return <ErrorState onRetry={() => void dashboardQuery.refetch()} />;
  return <DashboardContent dashboard={dashboardQuery.data} />;
}
