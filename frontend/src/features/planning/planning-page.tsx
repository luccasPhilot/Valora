import { CalendarClock, CircleCheck, Clock, Pause, Plus, SkipForward } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { CardSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotice } from '@/hooks/use-notice';
import type {
  OccurrenceDecision,
  OccurrenceStatus,
  PlannedEntry,
  PlannedEntryInput,
  PlannedOccurrence,
} from '@/lib/api/planned-entries';
import { ApiError } from '@/lib/api-client';
import { todayInSaoPaulo } from '@/lib/dates';

import { monthOf, parseMonth } from '../budgets/budget-months';
import { MonthSelector } from '../budgets/month-selector';
import { useCategories } from '../categories/categories-queries';
import {
  entryFieldErrorsFromApi,
  type EntrySubmitOutcome,
  inputFromEntry,
} from './entry-form-values';
import { EntryPanel, type EntryPanelTarget } from './entry-panel';
import { OccurrenceGroup } from './occurrence-group';
import { OccurrencePanel } from './occurrence-panel';
import { PausedEntries } from './paused-entries';
import {
  useDecideOccurrence,
  useDeletePlannedEntry,
  usePlannedEntries,
  useSavePlannedEntry,
  useUndoOccurrence,
} from './planning-queries';
import { PlanningSummary } from './planning-summary';

const MONTH_PARAM = 'month';
const SAVE_FAILED_MESSAGE = 'Não foi possível salvar a previsão. Tente de novo.';

const DECISION_NOTICES: Readonly<Record<'linked' | 'realized' | 'skipped', string>> = {
  linked: 'Transação vinculada',
  realized: 'Marcada como realizada',
  skipped: 'Pulada neste mês',
};

function noticeFor(decision: OccurrenceDecision): string {
  if (decision.action === 'skip') return DECISION_NOTICES.skipped;
  return decision.transactionId ? DECISION_NOTICES.linked : DECISION_NOTICES.realized;
}

function PlanningSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-4">
      <div className="grid gap-3 min-[400px]:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

const GROUPS: readonly {
  readonly status: OccurrenceStatus;
  readonly title: string;
  readonly icon: typeof Clock;
}[] = [
  { status: 'pending', title: 'Para acontecer', icon: Clock },
  { status: 'realized', title: 'Realizadas', icon: CircleCheck },
  { status: 'skipped', title: 'Puladas', icon: SkipForward },
];

/** Planejamento: as receitas e despesas previstas do mês, com as ações de cada uma. */
export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = parseMonth(searchParams.get(MONTH_PARAM), monthOf(todayInSaoPaulo()));
  const planningQuery = usePlannedEntries(month);
  const categoriesQuery = useCategories();
  const saveEntry = useSavePlannedEntry();
  const togglePaused = useSavePlannedEntry();
  const deleteEntry = useDeletePlannedEntry();
  const decide = useDecideOccurrence(month);
  const undo = useUndoOccurrence(month);
  const { notice, showNotice } = useNotice();
  const [selectedOccurrence, setSelectedOccurrence] = useState<PlannedOccurrence | null>(null);
  const [entryTarget, setEntryTarget] = useState<EntryPanelTarget | null>(null);

  const items = planningQuery.data?.items ?? [];
  const pausedEntries = planningQuery.data?.pausedEntries ?? [];

  function resetErrors() {
    saveEntry.reset();
    togglePaused.reset();
    deleteEntry.reset();
    decide.reset();
    undo.reset();
  }

  function openOccurrence(occurrence: PlannedOccurrence | null) {
    resetErrors();
    setSelectedOccurrence(occurrence);
  }

  function openEntry(target: EntryPanelTarget | null) {
    resetErrors();
    setEntryTarget(target);
  }

  function changeMonth(nextMonth: string) {
    setSearchParams({ [MONTH_PARAM]: nextMonth }, { replace: true });
    openOccurrence(null);
    openEntry(null);
  }

  function decideOccurrence(occurrence: PlannedOccurrence, decision: OccurrenceDecision) {
    decide.mutate(
      { plannedEntryId: occurrence.plannedEntryId, decision },
      {
        onSuccess: () => {
          setSelectedOccurrence(null);
          showNotice({ tone: 'success', message: noticeFor(decision) });
        },
      },
    );
  }

  function undoOccurrence(occurrence: PlannedOccurrence) {
    undo.mutate(occurrence.plannedEntryId, {
      onSuccess: () => {
        setSelectedOccurrence(null);
        showNotice({ tone: 'success', message: 'Decisão desfeita' });
      },
    });
  }

  async function saveEntryFromForm(
    id: string | undefined,
    input: PlannedEntryInput,
  ): Promise<EntrySubmitOutcome> {
    // Editar não reativa uma previsão pausada: quem pausa e reativa é o botão do painel.
    const isActive = entryTarget?.kind === 'edit' ? entryTarget.entry.isActive : true;
    try {
      await saveEntry.mutateAsync({ id, input: { ...input, isActive } });
      setEntryTarget(null);
      showNotice({ tone: 'success', message: 'Previsão salva' });
      return { isSaved: true };
    } catch (error) {
      const fieldErrors = error instanceof ApiError ? entryFieldErrorsFromApi(error.details) : {};
      return { isSaved: false, fieldErrors, message: SAVE_FAILED_MESSAGE };
    }
  }

  function toggleEntryPaused(entry: PlannedEntry) {
    togglePaused.mutate(
      { id: entry.id, input: inputFromEntry(entry, !entry.isActive) },
      {
        onSuccess: () => {
          setEntryTarget(null);
          showNotice({
            tone: 'success',
            message: entry.isActive ? 'Previsão pausada' : 'Previsão reativada',
          });
        },
      },
    );
  }

  function removeEntry(entry: PlannedEntry) {
    deleteEntry.mutate(entry.id, {
      onSuccess: () => {
        setEntryTarget(null);
        showNotice({ tone: 'success', message: 'Previsão excluída' });
      },
    });
  }

  function editEntryOf(occurrence: PlannedOccurrence) {
    resetErrors();
    setSelectedOccurrence(null);
    setEntryTarget({ kind: 'edit', entry: occurrence.entry });
  }

  const addButton = (
    <Button type="button" onClick={() => openEntry({ kind: 'create' })}>
      <Plus aria-hidden="true" />
      Adicionar previsão
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSelector month={month} onChange={changeMonth} label="Mês do planejamento" />
        {items.length > 0 ? addButton : null}
      </div>
      {planningQuery.isPending ? <PlanningSkeleton /> : null}
      {planningQuery.isError ? <ErrorState onRetry={() => void planningQuery.refetch()} /> : null}
      {planningQuery.isSuccess && items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Planeje o mês"
          description="Cadastre o que você já sabe que vem: o salário, o aluguel, o seguro do ano."
          action={addButton}
        />
      ) : null}
      {planningQuery.isSuccess && items.length > 0 ? (
        <>
          <PlanningSummary totals={planningQuery.data.totals} />
          {GROUPS.map((group) => (
            <OccurrenceGroup
              key={group.status}
              title={group.title}
              icon={group.icon}
              occurrences={items.filter((occurrence) => occurrence.status === group.status)}
              onSelect={openOccurrence}
            />
          ))}
        </>
      ) : null}
      {planningQuery.isSuccess ? (
        <PausedEntries
          entries={pausedEntries}
          icon={Pause}
          onSelect={(entry) => openEntry({ kind: 'edit', entry })}
        />
      ) : null}
      <OccurrencePanel
        occurrence={selectedOccurrence}
        isSaving={decide.isPending || undo.isPending}
        hasError={decide.isError || undo.isError}
        onDecide={decideOccurrence}
        onUndo={undoOccurrence}
        onEditEntry={editEntryOf}
        onClose={() => openOccurrence(null)}
      />
      <EntryPanel
        target={entryTarget}
        month={month}
        categories={categoriesQuery.data ?? []}
        isSaving={saveEntry.isPending}
        isWorking={togglePaused.isPending || deleteEntry.isPending}
        hasActionError={togglePaused.isError || deleteEntry.isError}
        onSave={saveEntryFromForm}
        onTogglePaused={toggleEntryPaused}
        onDelete={removeEntry}
        onClose={() => openEntry(null)}
      />
      <NoticeRegion notice={notice} />
    </div>
  );
}
