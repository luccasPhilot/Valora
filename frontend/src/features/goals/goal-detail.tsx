import { ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ContributionInput, Goal, GoalContribution } from '@/lib/api/goals';
import { ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';

import { ContributionForm } from './contribution-form';
import type { ContributionType } from './contribution-form-values';
import { GoalHistory } from './goal-history';
import { GoalLinkedItems } from './goal-linked-items';
import { GoalStatusLine } from './goal-status-line';
import { useAddContribution, useDeleteGoal, useRemoveContribution } from './goals-queries';

const CONFLICT_STATUS = 409;
const REMOVE_ERROR_MESSAGE = 'Não foi possível remover. Tente de novo.';
const REMOVE_CONFLICT_MESSAGE =
  'Não dá para remover: há retiradas depois deste aporte e o valor acumulado ficaria negativo. Remova as retiradas antes.';

interface GoalDetailProps {
  goal: Goal;
  onEdit: () => void;
  onDeleted: (goal: Goal) => void;
  onNotice: (message: string) => void;
}

function GoalSummary({ goal }: { goal: Goal }) {
  return (
    <div className="space-y-3">
      <Progress
        value={goal.progressPercent}
        aria-label={`${goal.name}: ${goal.progressPercent}% do valor desejado`}
        indicatorClassName="bg-primary"
      />
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm tabular-nums">
        <span>
          <Money cents={goal.savedCents} /> de <Money cents={goal.targetCents} />
        </span>
        <span className="text-muted-foreground">{goal.progressPercent}%</span>
      </p>
      <GoalStatusLine goal={goal} />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {goal.remainingCents > 0 ? (
          <>
            <dt className="text-muted-foreground">Faltam</dt>
            <dd className="text-right tabular-nums">
              <Money cents={goal.remainingCents} />
            </dd>
          </>
        ) : null}
        {goal.monthlyRateCents > 0 ? (
          <>
            <dt className="text-muted-foreground">Ritmo atual</dt>
            <dd className="text-right tabular-nums">
              <Money cents={goal.monthlyRateCents} />
              /mês
            </dd>
          </>
        ) : null}
        {goal.targetDate ? (
          <>
            <dt className="text-muted-foreground">Prazo</dt>
            <dd className="text-right tabular-nums">{formatDate(goal.targetDate)}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

interface EntryActionsProps {
  goal: Goal;
  onAdded: (input: ContributionInput) => void;
}

function EntryActions({ goal, onAdded }: EntryActionsProps) {
  const [entryType, setEntryType] = useState<ContributionType | null>(null);
  const addContribution = useAddContribution();

  function submit(input: ContributionInput) {
    addContribution.mutate(
      { goalId: goal.id, input },
      {
        onSuccess: () => {
          setEntryType(null);
          onAdded(input);
        },
      },
    );
  }

  function open(type: ContributionType) {
    addContribution.reset();
    setEntryType(type);
  }

  if (entryType !== null) {
    return (
      <ContributionForm
        // Trocar entre aporte e retirada recomeça o formulário.
        key={entryType}
        type={entryType}
        savedCents={goal.savedCents}
        isPending={addContribution.isPending}
        hasError={addContribution.isError}
        onSubmit={submit}
        onCancel={() => setEntryType(null)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button type="button" className="sm:flex-1" onClick={() => open('deposit')}>
        <ArrowDownToLine aria-hidden="true" />
        Registrar aporte
      </Button>
      <Button
        type="button"
        variant="outline"
        className="sm:flex-1"
        disabled={goal.savedCents === 0}
        onClick={() => open('withdrawal')}
      >
        <ArrowUpFromLine aria-hidden="true" />
        Registrar retirada
      </Button>
    </div>
  );
}

function removeErrorMessage(error: Error | null): string | null {
  if (error === null) return null;
  return error instanceof ApiError && error.status === CONFLICT_STATUS
    ? REMOVE_CONFLICT_MESSAGE
    : REMOVE_ERROR_MESSAGE;
}

/** Detalhe da meta: situação, "Registrar aporte" e "Registrar retirada", histórico, editar e excluir. */
export function GoalDetail({ goal, onEdit, onDeleted, onNotice }: GoalDetailProps) {
  const [contributionToRemove, setContributionToRemove] = useState<GoalContribution | null>(null);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const removeContribution = useRemoveContribution();
  const deleteGoal = useDeleteGoal();

  function confirmRemoval(contribution: GoalContribution) {
    removeContribution.mutate(
      { goalId: goal.id, contributionId: contribution.id },
      {
        onSuccess: () => {
          setContributionToRemove(null);
          onNotice('Registro removido');
        },
      },
    );
  }

  function confirmDeletion() {
    deleteGoal.mutate(goal.id, {
      onSuccess: () => {
        setConfirmingDelete(false);
        onDeleted(goal);
      },
    });
  }

  return (
    <div className="space-y-6">
      <GoalSummary goal={goal} />
      {goal.isLinked ? (
        <GoalLinkedItems goal={goal} />
      ) : (
        <>
          <EntryActions
            goal={goal}
            onAdded={(input) =>
              onNotice(input.type === 'deposit' ? 'Aporte registrado' : 'Retirada registrada')
            }
          />
          <GoalHistory
            goalId={goal.id}
            onRemove={(contribution) => {
              removeContribution.reset();
              setContributionToRemove(contribution);
            }}
          />
        </>
      )}
      <div className="space-y-2 border-t pt-5">
        <Button type="button" variant="outline" className="w-full" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          Editar meta
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => {
            deleteGoal.reset();
            setConfirmingDelete(true);
          }}
        >
          <Trash2 aria-hidden="true" />
          Excluir meta
        </Button>
      </div>
      <ConfirmDialog
        open={contributionToRemove !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setContributionToRemove(null);
        }}
        title="Remover este registro?"
        description="O valor acumulado da meta volta ao que era antes dele."
        confirmLabel="Remover"
        isPending={removeContribution.isPending}
        errorMessage={removeErrorMessage(removeContribution.error)}
        onConfirm={() => contributionToRemove && confirmRemoval(contributionToRemove)}
      />
      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Excluir meta?"
        description="A meta e todo o histórico de aportes dela somem. Não dá para desfazer."
        confirmLabel="Excluir"
        isPending={deleteGoal.isPending}
        errorMessage={deleteGoal.isError ? 'Não foi possível excluir. Tente de novo.' : null}
        onConfirm={confirmDeletion}
      />
    </div>
  );
}
