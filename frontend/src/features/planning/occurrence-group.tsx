import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

import type { PlannedOccurrence } from '@/lib/api/planned-entries';

import { OccurrenceRow } from './occurrence-row';

interface OccurrenceGroupProps {
  title: string;
  icon: LucideIcon;
  occurrences: readonly PlannedOccurrence[];
  onSelect: (occurrence: PlannedOccurrence) => void;
}

/** Um dos blocos do mês (para acontecer, realizadas, puladas). Sem ocorrências, o bloco não aparece. */
export function OccurrenceGroup({
  title,
  icon: Icon,
  occurrences,
  onSelect,
}: OccurrenceGroupProps) {
  const titleId = useId();
  if (occurrences.length === 0) return null;
  return (
    <section
      aria-labelledby={titleId}
      className="overflow-hidden rounded-xl border bg-card shadow-card"
    >
      <h2 id={titleId} className="type-label flex items-center gap-2 p-4 sm:px-5">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {title}
        <span className="font-normal text-muted-foreground">({occurrences.length})</span>
      </h2>
      <ul className="divide-y divide-border border-t">
        {occurrences.map((occurrence) => (
          <OccurrenceRow
            key={occurrence.plannedEntryId}
            occurrence={occurrence}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
}
