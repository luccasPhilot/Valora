import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

import type { PlannedEntry } from '@/lib/api/planned-entries';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { PlannedAmount } from './planned-amount';
import { describeRecurrence } from './planning-labels';

interface PausedEntriesProps {
  entries: readonly PlannedEntry[];
  icon: LucideIcon;
  onSelect: (entry: PlannedEntry) => void;
}

/** Previsões pausadas: não geram ocorrências em mês nenhum, mas aqui dá para reativar ou excluir. */
export function PausedEntries({ entries, icon: Icon, onSelect }: PausedEntriesProps) {
  const titleId = useId();
  if (entries.length === 0) return null;
  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl border bg-card shadow-card"
    >
      <h2 id={titleId} className="type-label flex items-center gap-2 p-4 sm:px-5">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        Pausadas
        <span className="font-normal text-muted-foreground">({entries.length})</span>
      </h2>
      <ul className="divide-y divide-border border-t">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <CategoryBadgeIcon name={entry.categoryIcon} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{entry.description}</span>
                <span className="text-xs break-words text-muted-foreground">
                  {describeRecurrence(entry)}
                </span>
              </span>
              <PlannedAmount
                cents={entry.amountCents}
                className="shrink-0 font-display text-base font-semibold whitespace-nowrap"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
