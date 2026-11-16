import { Money } from '@/components/money';
import { Progress } from '@/components/ui/progress';
import type { Goal } from '@/lib/api/goals';
import { formatDate } from '@/lib/format';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { LinkedBadge } from './goal-linked-items';
import { GoalStatusLine } from './goal-status-line';

interface GoalCardProps {
  goal: Goal;
  onSelect: (goal: Goal) => void;
}

/** Uma meta: ícone, nome, barra, valores e a situação em ícone + texto. Tocar abre o painel. */
export function GoalCard({ goal, onSelect }: GoalCardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(goal)}
        className="flex h-full min-h-11 w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left shadow-card outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-center gap-3">
          <CategoryBadgeIcon name={goal.icon} />
          <span className="min-w-0">
            <span className="block font-medium break-words">{goal.name}</span>
            {goal.targetDate ? (
              <span className="block text-sm text-muted-foreground">
                Prazo: {formatDate(goal.targetDate)}
              </span>
            ) : null}
            {goal.isLinked ? (
              <span className="mt-1 block">
                <LinkedBadge itemCount={goal.links.length} />
              </span>
            ) : null}
          </span>
        </span>
        <Progress
          value={goal.progressPercent}
          aria-label={`${goal.name}: ${goal.progressPercent}% do valor desejado`}
          indicatorClassName="bg-primary"
        />
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
          <span>
            <span className="font-display text-lg font-bold">
              <Money cents={goal.savedCents} isTrimmed />
            </span>{' '}
            de <Money cents={goal.targetCents} isTrimmed />
          </span>
          <span>{goal.progressPercent}%</span>
        </span>
        <GoalStatusLine goal={goal} />
      </button>
    </li>
  );
}
