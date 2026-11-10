import { CalendarClock, CircleAlert, CircleCheck, type LucideIcon } from 'lucide-react';

import type { BillStatus } from '@/lib/api/credit-card-bills';

interface StatusDisplay {
  readonly icon: LucideIcon;
  readonly label: string;
  /** Só o ícone usa a cor do status; o texto fica na cor normal (contraste). */
  readonly iconClass: string;
}

// Design System, "Status": sempre ícone + texto, nunca só a cor. Fatura em aberto é neutra:
// vermelho é só para o que estourou (aqui, a fatura vencida).
const STATUS_DISPLAY: Readonly<Record<BillStatus, StatusDisplay>> = {
  open: { icon: CalendarClock, label: 'Em aberto', iconClass: 'text-muted-foreground' },
  paid: { icon: CircleCheck, label: 'Paga', iconClass: 'text-status-ok' },
  overdue: { icon: CircleAlert, label: 'Vencida', iconClass: 'text-status-critical' },
};

export function BillStatusBadge({ status }: { status: BillStatus }) {
  const display = STATUS_DISPLAY[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
      <display.icon className={`size-4 shrink-0 ${display.iconClass}`} aria-hidden="true" />
      {display.label}
    </span>
  );
}
