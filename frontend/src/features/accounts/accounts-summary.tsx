import { CreditCard, Wallet } from 'lucide-react';

import { DataCard } from '@/components/cards/data-card';
import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import type { AccountsOverview } from '@/lib/api/accounts';

interface AccountsSummaryProps {
  totals: AccountsOverview['totals'];
}

/** Saldo total (corrente e poupança não ocultas) e faturas em aberto, calculados pela API. */
export function AccountsSummary({ totals }: AccountsSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <DataCard title="Saldo total" tier="hero" icon={Wallet} className="gap-2">
        <Metric
          size="display"
          value={<Money cents={totals.totalBalanceCents} />}
          caption="Contas correntes e poupanças"
          isNegative={totals.totalBalanceCents < 0}
        />
      </DataCard>
      <DataCard title="Faturas em aberto" icon={CreditCard} className="gap-2">
        <Metric
          value={<Money cents={totals.openCreditCardBillsCents} />}
          caption={
            <>
              Limite disponível <Money cents={totals.availableCreditCents} />
            </>
          }
        />
      </DataCard>
    </div>
  );
}
