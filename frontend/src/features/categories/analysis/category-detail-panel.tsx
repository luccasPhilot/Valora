import { Link } from 'react-router';

import { Metric } from '@/components/cards/metric';
import { FormPanel } from '@/components/form-panel';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { CategoryInsight, CategoryInsights } from '@/lib/api/category-insights';
import { formatMonthLongName } from '@/lib/format';

import { describeComparedPeriod, describeVariation } from './analysis-labels';
import { insightTransactionsPath } from './analysis-links';
import { BudgetStatusBadge } from './budget-status-badge';
import { CategoryHistoryChart } from './category-history-chart';

const NO_HISTORY_TEXT = 'O histórico desta categoria começa neste mês.';

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="type-label">{label}</dt>
      <dd className="font-medium tabular-nums">{children}</dd>
    </div>
  );
}

function VariationText({
  category,
  insights,
}: {
  category: CategoryInsight;
  insights: CategoryInsights;
}) {
  const description = describeVariation(category.variationPercent);
  const period = describeComparedPeriod({
    comparedThroughDay: insights.totals.comparedThroughDay,
    previousMonth: insights.previousMonth,
  });
  if (description === null) return <>Sem gasto no período anterior para comparar.</>;
  return (
    <>
      {description}, {period}
    </>
  );
}

interface DetailBodyProps {
  category: CategoryInsight;
  insights: CategoryInsights;
}

function DetailBody({ category, insights }: DetailBodyProps) {
  const hasHistory = category.averageCents !== null;
  const transactionsPath = insightTransactionsPath(category, insights.month);
  return (
    <div className="space-y-5">
      <Metric
        size="lg"
        value={<Money cents={-category.spentCents} isSigned />}
        caption={<VariationText category={category} insights={insights} />}
      />
      {hasHistory ? (
        <CategoryHistoryChart
          categoryName={category.name}
          months={insights.months}
          monthlyCents={category.monthlyCents}
          partialMonth={insights.isInProgress ? insights.month : null}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{NO_HISTORY_TEXT}</p>
      )}
      {category.averageCents === null ? null : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Stat label="Média dos meses anteriores">
            <Money cents={category.averageCents} />
          </Stat>
          <Stat label={`Maior mês (${formatMonthLongName(category.peak.month)})`}>
            <Money cents={category.peak.cents} />
          </Stat>
        </dl>
      )}
      {category.budget ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <BudgetStatusBadge status={category.budget.status} />
          <span className="text-muted-foreground">
            <Money cents={category.spentCents} isTrimmed /> de{' '}
            <Money cents={category.budget.limitCents} isTrimmed />
          </span>
        </p>
      ) : null}
      {transactionsPath ? (
        <Button asChild variant="outline" className="w-full">
          <Link to={transactionsPath}>Ver transações</Link>
        </Button>
      ) : null}
    </div>
  );
}

interface CategoryDetailPanelProps {
  /** Nulo com o painel fechado. */
  category: CategoryInsight | null;
  insights: CategoryInsights;
  onClose: () => void;
}

/**
 * O que decidir sobre uma categoria: o gasto do mês, os últimos meses, a média, o orçamento e o
 * caminho para as transações. O painel é a única área com rolagem (Design System).
 */
export function CategoryDetailPanel({ category, insights, onClose }: CategoryDetailPanelProps) {
  return (
    <FormPanel
      open={category !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={category?.name ?? 'Categoria'}
      description={`Gasto de ${formatMonthLongName(insights.month)} e dos últimos meses.`}
    >
      {category ? <DetailBody category={category} insights={insights} /> : null}
    </FormPanel>
  );
}
