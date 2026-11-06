import type { PlannedOccurrence } from '@/lib/api/planned-entries';
import { formatDate } from '@/lib/format';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { PlannedAmount } from './planned-amount';
import { describeRealization, describeRecurrence } from './planning-labels';

interface OccurrenceRowProps {
  occurrence: PlannedOccurrence;
  onSelect: (occurrence: PlannedOccurrence) => void;
}

function secondLine(occurrence: PlannedOccurrence): string {
  if (occurrence.status === 'realized') return describeRealization(occurrence);
  return describeRecurrence(occurrence.entry);
}

/** Uma ocorrência do mês: categoria, descrição, data prevista, repetição e valor. Tocar abre as ações. */
export function OccurrenceRow({ occurrence, onSelect }: OccurrenceRowProps) {
  const { entry } = occurrence;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(occurrence)}
        className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <CategoryBadgeIcon name={entry.categoryIcon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{entry.description}</span>
          <span className="text-xs break-words text-muted-foreground">
            {formatDate(occurrence.date)} · {secondLine(occurrence)}
          </span>
        </span>
        <PlannedAmount
          cents={entry.amountCents}
          className="shrink-0 font-display text-base font-semibold whitespace-nowrap"
        />
      </button>
    </li>
  );
}
