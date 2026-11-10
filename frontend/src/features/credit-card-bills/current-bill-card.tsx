import { CreditCard, FileText } from 'lucide-react';

import { Money } from '@/components/money';
import type { CardBills } from '@/lib/api/credit-card-bills';

import { DashboardSection, SectionEmpty } from '../dashboard/dashboard-section';
import { describeDueDate, ESTIMATED_DUE_DATE_HINT, hasPartialPayment } from './bill-labels';
import { BillStatusBadge } from './bill-status-badge';

function cardTitle(card: CardBills): string {
  return card.lastDigits ? `${card.accountName} · final ${card.lastDigits}` : card.accountName;
}

function CurrentBillDetails({ card }: { card: CardBills }) {
  const bill = card.currentBill;
  if (bill === null) {
    return <SectionEmpty message="Nenhuma fatura em aberto neste cartão." />;
  }
  const dueText = describeDueDate(bill);
  return (
    <div className="space-y-3">
      <p className="font-display text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
        <Money cents={bill.totalCents} />
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <BillStatusBadge status={bill.status} />
        {dueText ? <span className="text-sm">{dueText}</span> : null}
      </div>
      {bill.isEstimatedDueDate ? (
        <p className="text-xs text-muted-foreground">{ESTIMATED_DUE_DATE_HINT}</p>
      ) : null}
      {hasPartialPayment(bill) ? (
        <p className="text-sm text-muted-foreground">
          <Money cents={bill.paidCents} /> já pagos
        </p>
      ) : null}
    </div>
  );
}

/** A fatura atual do cartão: valor, situação (ícone e texto) e vencimento. */
export function CurrentBillCard({ card }: { card: CardBills }) {
  return (
    <DashboardSection title="Fatura atual" icon={FileText}>
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <CreditCard className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">
          {cardTitle(card)}
          {card.institutionName ? ` · ${card.institutionName}` : ''}
        </span>
      </p>
      <CurrentBillDetails card={card} />
    </DashboardSection>
  );
}
