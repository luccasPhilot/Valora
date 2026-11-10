import { cn } from 'cn';
import { Clock } from 'lucide-react';

import { Money } from '@/components/money';
import type { ProjectionEvent } from '@/lib/api/projection';
import { formatIsoDayMonth } from '@/lib/format';

import { describeEventKind } from './projection-labels';

const OVERDUE_LABEL = 'Atrasada';
const ESTIMATED_DATE_LABEL = 'Vencimento estimado';

// Design System, "Status": sempre ícone + texto; só o ícone usa a cor do status.
function OverdueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
      <Clock className="size-3.5 shrink-0 text-status-warning" aria-hidden="true" />
      {OVERDUE_LABEL}
    </span>
  );
}

function EventRow({ event }: { event: ProjectionEvent }) {
  return (
    <tr className="border-t align-top">
      <td className="py-3 pr-3 text-sm whitespace-nowrap tabular-nums">
        {formatIsoDayMonth(event.date)}
      </td>
      <td className="min-w-0 py-3 pr-3">
        <span className="block text-sm font-medium break-words">{event.description}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {describeEventKind(event)}
          {event.isEstimatedDate ? <span>· {ESTIMATED_DATE_LABEL}</span> : null}
          {event.isOverdue ? <OverdueBadge /> : null}
        </span>
      </td>
      <td
        className={cn(
          'py-3 text-right font-display text-sm font-semibold whitespace-nowrap tabular-nums',
          event.amountCents > 0 && 'text-positive',
        )}
      >
        <Money cents={event.amountCents} isSigned />
      </td>
    </tr>
  );
}

/** Os lançamentos que compõem a projeção, em ordem de data. */
export function ProjectionEvents({ events }: { events: readonly ProjectionEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nada previsto nem fatura a vencer até o fim do mês.
      </p>
    );
  }
  return (
    <table className="w-full table-fixed text-left">
      <caption className="sr-only">Lançamentos que compõem a projeção do fim do mês</caption>
      <colgroup>
        <col className="w-16" />
        <col />
        <col className="w-32" />
      </colgroup>
      <thead className="sr-only">
        <tr>
          <th scope="col">Dia</th>
          <th scope="col">Lançamento</th>
          <th scope="col">Valor</th>
        </tr>
      </thead>
      <tbody>
        {/* Sem id: duas faturas iguais (mesmo cartão, valor e dia) são lançamentos distintos. */}
        {events.map((event, position) => (
          <EventRow key={`${position}-${event.type}-${event.date}`} event={event} />
        ))}
      </tbody>
    </table>
  );
}
