import { Trash2 } from 'lucide-react';

import { Money } from '@/components/money';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import type { GoalContribution } from '@/lib/api/goals';
import { formatDate } from '@/lib/format';

import { CONTRIBUTION_KIND_LABELS } from './goal-labels';
import { useGoalContributions } from './goals-queries';

const SKELETON_ROWS = 3;

interface GoalHistoryProps {
  goalId: string;
  onRemove: (contribution: GoalContribution) => void;
}

interface HistoryRowProps {
  contribution: GoalContribution;
  onRemove: (contribution: GoalContribution) => void;
}

function HistoryRow({ contribution, onRemove }: HistoryRowProps) {
  const label = CONTRIBUTION_KIND_LABELS[contribution.kind];
  const date = formatDate(contribution.date);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{date}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span
          className={`font-medium tabular-nums ${contribution.amountCents > 0 ? 'text-positive' : ''}`}
        >
          <Money cents={contribution.amountCents} isSigned />
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remover ${label.toLowerCase()} de ${date}`}
          onClick={() => onRemove(contribution)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </span>
    </li>
  );
}

/** Histórico completo da meta, do mais recente ao mais antigo, uma página por vez. */
export function GoalHistory({ goalId, onRemove }: GoalHistoryProps) {
  const query = useGoalContributions(goalId, true);
  const contributions = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section aria-labelledby={`history-${goalId}`} className="space-y-2">
      <h3 id={`history-${goalId}`} className="font-display text-lg font-semibold">
        Histórico
      </h3>
      {query.isPending ? <RowsSkeleton rowCount={SKELETON_ROWS} /> : null}
      {query.isError ? (
        <div role="alert" className="space-y-2 text-sm">
          <p className="text-destructive">Não foi possível carregar o histórico.</p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {query.isSuccess && contributions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada registrado ainda. Use “Registrar aporte” quando guardar um valor.
        </p>
      ) : null}
      {contributions.length > 0 ? (
        <ul className="divide-y">
          {contributions.map((contribution) => (
            <HistoryRow key={contribution.id} contribution={contribution} onRemove={onRemove} />
          ))}
        </ul>
      ) : null}
      {query.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Ver mais
        </Button>
      ) : null}
    </section>
  );
}
