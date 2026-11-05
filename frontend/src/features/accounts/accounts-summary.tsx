import { CreditCard, Wallet } from 'lucide-react';

import { Money } from '@/components/money';
import type { AccountsOverview } from '@/lib/api/accounts';

interface AccountsSummaryProps {
  totals: AccountsOverview['totals'];
}

/** Saldo total (corrente e poupança não ocultas) e faturas em aberto, calculados pela API. */
export function AccountsSummary({ totals }: AccountsSummaryProps) {
  const balanceColorClass = totals.totalBalanceCents < 0 ? 'text-destructive' : '';
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <section
        aria-labelledby="total-balance-title"
        className="space-y-2 rounded-xl bg-secondary p-5"
      >
        <h2 id="total-balance-title" className="type-label flex items-center gap-2">
          <Wallet className="size-4 text-primary" aria-hidden="true" />
          Saldo total
        </h2>
        <p className={`type-display tabular-nums ${balanceColorClass}`}>
          <Money cents={totals.totalBalanceCents} />
        </p>
        <p className="text-sm text-muted-foreground">Contas correntes e poupanças</p>
      </section>
      <section
        aria-labelledby="open-bills-title"
        className="space-y-2 rounded-lg border bg-card p-5 shadow-card"
      >
        <h2 id="open-bills-title" className="type-label flex items-center gap-2">
          <CreditCard className="size-4 text-primary" aria-hidden="true" />
          Faturas em aberto
        </h2>
        <p className="type-value-lg tabular-nums">
          <Money cents={totals.openCreditCardBillsCents} />
        </p>
        <p className="text-sm text-muted-foreground">
          Limite disponível <Money cents={totals.availableCreditCents} />
        </p>
      </section>
    </div>
  );
}
