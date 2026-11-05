import { Copy, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { CardSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotice } from '@/hooks/use-notice';
import type { Budget } from '@/lib/api/budgets';
import { todayInSaoPaulo } from '@/lib/dates';

import { useCategories } from '../categories/categories-queries';
import { monthOf, parseMonth } from './budget-months';
import { BudgetPanel, type BudgetPanelTarget, type LimitInput } from './budget-panel';
import { BudgetRow } from './budget-row';
import {
  useBudgets,
  useCopyPreviousBudgets,
  useRemoveBudgetLimit,
  useSetBudgetLimit,
} from './budgets-queries';
import { BudgetsSummary } from './budgets-summary';
import { MonthSelector } from './month-selector';

const MONTH_PARAM = 'month';

function BudgetsSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-4">
      <CardSkeleton />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

interface BudgetActionsProps {
  isCopying: boolean;
  onCopy: () => void;
  onCreate: () => void;
}

function BudgetActions({ isCopying, onCopy, onCreate }: BudgetActionsProps) {
  return (
    <>
      <Button type="button" onClick={onCreate}>
        <Plus aria-hidden="true" />
        Criar orçamento
      </Button>
      <Button type="button" variant="outline" disabled={isCopying} onClick={onCopy}>
        <Copy aria-hidden="true" />
        Copiar do mês anterior
      </Button>
    </>
  );
}

export function Component() {
  const today = todayInSaoPaulo();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = parseMonth(searchParams.get(MONTH_PARAM), monthOf(today));
  const budgetsQuery = useBudgets(month);
  const categoriesQuery = useCategories();
  const setLimit = useSetBudgetLimit(month);
  const removeLimit = useRemoveBudgetLimit(month);
  const copyPrevious = useCopyPreviousBudgets(month);
  const { notice, showNotice } = useNotice();
  const [panelTarget, setPanelTarget] = useState<BudgetPanelTarget | null>(null);

  const budgets = budgetsQuery.data?.items ?? [];
  const budgetedCategoryIds = new Set(budgets.map((budget) => budget.categoryId));
  const availableCategories = (categoriesQuery.data ?? []).filter(
    (category) =>
      category.kind === 'expense' && !category.isArchived && !budgetedCategoryIds.has(category.id),
  );

  function openPanel(target: BudgetPanelTarget | null) {
    setLimit.reset();
    removeLimit.reset();
    setPanelTarget(target);
  }

  function changeMonth(nextMonth: string) {
    setSearchParams({ [MONTH_PARAM]: nextMonth }, { replace: true });
    openPanel(null);
  }

  function saveLimit(input: LimitInput) {
    setLimit.mutate(input, {
      onSuccess: (saved) => {
        setPanelTarget(null);
        showNotice({ tone: 'success', message: `Limite de ${saved.categoryName} salvo` });
      },
    });
  }

  function removeBudget(budget: Budget) {
    removeLimit.mutate(budget.categoryId, {
      onSuccess: () => {
        setPanelTarget(null);
        showNotice({ tone: 'success', message: `Limite de ${budget.categoryName} removido` });
      },
    });
  }

  function copyFromPreviousMonth() {
    copyPrevious.mutate(undefined, {
      onSuccess: (copied) =>
        showNotice(
          copied === 0
            ? { tone: 'error', message: 'Nada para copiar: o mês anterior não tem limites novos' }
            : {
                tone: 'success',
                message: `${copied} limite${copied === 1 ? '' : 's'} copiado${copied === 1 ? '' : 's'}`,
              },
        ),
      onError: () => showNotice({ tone: 'error', message: 'Não foi possível copiar os limites' }),
    });
  }

  const actions = (
    <BudgetActions
      isCopying={copyPrevious.isPending}
      onCopy={copyFromPreviousMonth}
      onCreate={() => openPanel({ kind: 'create' })}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSelector month={month} onChange={changeMonth} />
        {budgets.length > 0 ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {budgetsQuery.isPending ? <BudgetsSkeleton /> : null}
      {budgetsQuery.isError ? <ErrorState onRetry={() => void budgetsQuery.refetch()} /> : null}
      {budgetsQuery.isSuccess && budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhum orçamento neste mês"
          description="Defina quanto você quer gastar em cada categoria. Eu aviso quando chegar perto."
          action={<div className="flex flex-wrap justify-center gap-2">{actions}</div>}
        />
      ) : null}
      {budgetsQuery.isSuccess && budgets.length > 0 ? (
        <>
          <BudgetsSummary totals={budgetsQuery.data.totals} />
          <ul className="grid gap-3 lg:grid-cols-2">
            {budgets.map((budget) => (
              <BudgetRow
                key={budget.categoryId}
                budget={budget}
                onSelect={(selected) => openPanel({ kind: 'edit', budget: selected })}
              />
            ))}
          </ul>
        </>
      ) : null}
      <BudgetPanel
        target={panelTarget}
        month={month}
        availableCategories={availableCategories}
        isSaving={setLimit.isPending}
        isRemoving={removeLimit.isPending}
        hasError={setLimit.isError || removeLimit.isError}
        onSave={saveLimit}
        onRemove={removeBudget}
        onClose={() => openPanel(null)}
      />
      <NoticeRegion notice={notice} />
    </div>
  );
}
