import { Archive, Link2 } from 'lucide-react';

import { Money } from '@/components/money';
import type { Goal, GoalLink } from '@/lib/api/goals';

export const ARCHIVED_LINK_LABEL = 'Banco removido do Valora: não conta';

/** "Vinculada · 2 itens": a meta acompanha o saldo de contas e investimentos. */
export function LinkedBadge({ itemCount }: { itemCount: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground">
      <Link2 className="size-3" aria-hidden="true" />
      Vinculada · {itemCount} {itemCount === 1 ? 'item' : 'itens'}
    </span>
  );
}

function LinkedItemRow({ link }: { link: GoalLink }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-sm">
      <span className="min-w-0">
        <span className="block font-medium break-words">{link.name}</span>
        {link.institutionName ? (
          <span className="block break-words text-muted-foreground">{link.institutionName}</span>
        ) : null}
        {link.isArchived ? (
          <span className="mt-1 flex items-start gap-2">
            <Archive className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
            {ARCHIVED_LINK_LABEL}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 tabular-nums">
        <Money cents={link.balanceCents} />
      </span>
    </li>
  );
}

/** Itens que a meta acompanha, de onde vem o valor e o ritmo, e os aportes antigos guardados. */
export function GoalLinkedItems({ goal }: { goal: Goal }) {
  const headingId = `linked-${goal.id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h3 id={headingId} className="font-display text-lg font-semibold">
        Itens vinculados
      </h3>
      <ul className="divide-y">
        {goal.links.map((link) => (
          <LinkedItemRow key={`${link.type}:${link.id}`} link={link} />
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        O valor acompanha o saldo e muda na sincronização diária.
      </p>
      <p className="text-sm text-muted-foreground">
        O ritmo vem da variação dos saldos nos últimos 90 dias e mistura aporte e rendimento.
      </p>
      {goal.manualSavedCents > 0 ? (
        <p className="text-sm text-muted-foreground">
          Aportes guardados: <Money cents={goal.manualSavedCents} />. Não contam enquanto a meta
          estiver vinculada.
        </p>
      ) : null}
    </section>
  );
}
