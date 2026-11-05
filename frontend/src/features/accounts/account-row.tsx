import { EyeOff } from 'lucide-react';

import { Money } from '@/components/money';
import type { Account } from '@/lib/api/accounts';

import { ACCOUNT_TYPE_LABELS } from './account-groups';

interface AccountRowProps {
  account: Account;
  onSelect: (account: Account) => void;
}

function describeAccount(account: Account): string {
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type];
  return account.lastDigits ? `${typeLabel} · final ${account.lastDigits}` : typeLabel;
}

// Saldo negativo (cheque especial) em `destructive`; despesa e saldo positivo na cor normal.
function balanceColorClass(balanceCents: number): string {
  return balanceCents < 0 ? 'text-destructive' : '';
}

function CreditCardAmounts({ account }: { account: Account }) {
  return (
    <>
      <span className="text-xs text-muted-foreground">Fatura atual</span>
      <span className="font-display text-base font-semibold tabular-nums">
        <Money cents={account.balanceCents ?? 0} />
      </span>
      {account.availableLimitCents !== null ? (
        <span className="text-xs text-muted-foreground">
          Limite disponível <Money cents={account.availableLimitCents} />
        </span>
      ) : null}
    </>
  );
}

function BalanceAmount({ account }: { account: Account }) {
  const balanceCents = account.balanceCents ?? 0;
  return (
    <span
      className={`font-display text-base font-semibold tabular-nums ${balanceColorClass(balanceCents)}`}
    >
      <Money cents={balanceCents} />
    </span>
  );
}

/** Uma conta ou cartão dentro do card do banco. Tocar abre o painel com "Ocultar dos totais". */
export function AccountRow({ account, onSelect }: AccountRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(account)}
        className="flex min-h-11 w-full items-start justify-between gap-4 px-4 py-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{account.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{describeAccount(account)}</span>
            {account.isHidden ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                <EyeOff className="size-3" aria-hidden="true" />
                Fora dos totais
              </span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {account.type === 'credit_card' ? (
            <CreditCardAmounts account={account} />
          ) : (
            <BalanceAmount account={account} />
          )}
        </span>
      </button>
    </li>
  );
}
