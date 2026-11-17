import { ArrowDown, ArrowUp, ArrowUpDown, type LucideIcon } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Money } from '@/components/money';
import type { CategoryChange, CategoryInsights } from '@/lib/api/category-insights';

import { CategoryBadgeIcon } from '../category-icons';

const UNCATEGORIZED_ICON = 'tag';
const FULL_PERCENT = 100;

interface ChangeGroupProps {
  title: string;
  icon: LucideIcon;
  changes: readonly CategoryChange[];
  /** A maior diferença absoluta entre os dois grupos: a escala das barras. */
  largestCents: number;
  /** Quedas ancoram a barra à direita, altas à esquerda: a forma já diz o sentido. */
  isDecrease: boolean;
}

function ChangeGroup({ title, icon: Icon, changes, largestCents, isDecrease }: ChangeGroupProps) {
  if (changes.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {title}
      </h3>
      <ul className="space-y-2.5">
        {changes.map((change) => (
          <li key={change.categoryId ?? change.kind} className="space-y-1">
            <span className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <CategoryBadgeIcon name={change.icon ?? UNCATEGORIZED_ICON} />
                <span className="line-clamp-2 font-medium break-words">{change.name}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                <Money cents={change.differenceCents} isSigned />
              </span>
            </span>
            <span
              className={`flex h-2 overflow-hidden rounded-full bg-track ${isDecrease ? 'justify-end' : ''}`}
              aria-hidden="true"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{
                  width: `${(Math.abs(change.differenceCents) * FULL_PERCENT) / largestCents}%`,
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * O que mais subiu e o que mais caiu contra o período de comparação, em barras de uma cor só. Sem
 * mês anterior com gasto não há o que comparar: o cartão não aparece.
 */
export function ChangesCard({ insights }: { insights: CategoryInsights }) {
  if (insights.totals.previousSpentCents === 0) return null;
  const { increases, decreases } = insights.changes;
  const largestCents = Math.max(
    1,
    ...[...increases, ...decreases].map((change) => Math.abs(change.differenceCents)),
  );
  const hasChanges = increases.length + decreases.length > 0;
  return (
    <DataCard title="O que mudou" icon={ArrowUpDown} className="h-auto">
      {hasChanges ? (
        <div className="space-y-5">
          <ChangeGroup
            title="Subiram"
            icon={ArrowUp}
            changes={increases}
            largestCents={largestCents}
            isDecrease={false}
          />
          <ChangeGroup
            title="Caíram"
            icon={ArrowDown}
            changes={decreases}
            largestCents={largestCents}
            isDecrease
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria mudou em relação ao período anterior.
        </p>
      )}
    </DataCard>
  );
}
