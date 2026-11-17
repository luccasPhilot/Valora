import { ChartBarBig } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { DataCard } from '@/components/cards/data-card';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { CategoryInsight, CategoryInsights } from '@/lib/api/category-insights';
import { todayInSaoPaulo } from '@/lib/dates';

import { monthOf, parseMonth } from '../../budgets/budget-months';
import { MonthSelector } from '../../budgets/month-selector';
import { insightTransactionsPath } from './analysis-links';
import { useCategoryInsights } from './analysis-queries';
import { AttentionList } from './attention-list';
import { CategoryDetailPanel } from './category-detail-panel';
import { categoryKeyOf, CategorySpendingList } from './category-spending-list';
import { ChangesCard } from './changes-card';
import { RecurringCard } from './recurring-card';
import { SpendingHero } from './spending-hero';

const MONTH_PARAM = 'month';
const STRETCH_NOTE = 'Estornos reduzem o gasto da categoria. Transferências não entram.';

function AnalysisSkeleton() {
  return (
    <div role="status" aria-label="Carregando análise" className="space-y-4">
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid gap-4 xl:grid-cols-12">
        <Skeleton className="h-96 rounded-xl xl:col-span-7" />
        <div className="space-y-4 xl:col-span-5">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

interface AnalysisContentProps {
  insights: CategoryInsights;
  onSelect: (category: CategoryInsight) => void;
  onSelectById: (categoryId: string) => void;
}

function AnalysisContent({ insights, onSelect, onSelectById }: AnalysisContentProps) {
  const uncategorizedPath = insightTransactionsPath(
    { kind: 'uncategorized', categoryId: null },
    insights.month,
  );
  return (
    <div className="space-y-4">
      <SpendingHero insights={insights} />
      <AttentionList
        attention={insights.attention}
        onSelectCategory={onSelectById}
        uncategorizedPath={uncategorizedPath}
      />
      <div className="grid gap-4 xl:grid-cols-12">
        <DataCard
          title="Para onde foi o dinheiro"
          icon={ChartBarBig}
          className="min-w-0 xl:col-span-7"
        >
          <CategorySpendingList
            categories={insights.categories}
            months={insights.months}
            onSelect={onSelect}
          />
          <p className="text-xs text-muted-foreground">{STRETCH_NOTE}</p>
        </DataCard>
        <div className="min-w-0 space-y-4 xl:col-span-5">
          <ChangesCard insights={insights} />
          <RecurringCard recurring={insights.recurring} />
        </div>
      </div>
    </div>
  );
}

/**
 * Tela "Categorias" (`/categorias`): o gasto de um mês por categoria, com comparação, tendência, orçamento
 * e cobranças recorrentes. O mês vai na URL (`?month=AAAA-MM`) e nunca passa do mês atual.
 */
export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const currentMonth = monthOf(todayInSaoPaulo());
  const requestedMonth = parseMonth(searchParams.get(MONTH_PARAM), currentMonth);
  const month = requestedMonth > currentMonth ? currentMonth : requestedMonth;
  const insightsQuery = useCategoryInsights(month);
  const insights = insightsQuery.data;
  const selected = insights?.categories.find((item) => categoryKeyOf(item) === selectedKey) ?? null;

  function changeMonth(nextMonth: string) {
    setSelectedKey(null);
    setSearchParams({ [MONTH_PARAM]: nextMonth }, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSelector
          month={month}
          onChange={changeMonth}
          maxMonth={currentMonth}
          label="Mês da análise"
        />
      </div>
      {insightsQuery.isPending ? <AnalysisSkeleton /> : null}
      {insightsQuery.isError ? (
        <ErrorState
          message="Não foi possível carregar a análise."
          onRetry={() => void insightsQuery.refetch()}
        />
      ) : null}
      {insights && insights.categories.length === 0 ? (
        <EmptyState
          icon={ChartBarBig}
          title="Nenhum gasto neste mês"
          description="Escolha outro mês ou espere a próxima sincronização trazer as transações."
        />
      ) : null}
      {insights && insights.categories.length > 0 ? (
        <AnalysisContent
          insights={insights}
          onSelect={(category) => setSelectedKey(categoryKeyOf(category))}
          onSelectById={setSelectedKey}
        />
      ) : null}
      {insights ? (
        <CategoryDetailPanel
          category={selected}
          insights={insights}
          onClose={() => setSelectedKey(null)}
        />
      ) : null}
    </div>
  );
}
