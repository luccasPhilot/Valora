import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DuplicateResolution, Transaction } from '@/lib/api/transactions';
import { formatDate } from '@/lib/format';

import { amountColorClass } from './transaction-item';
import { useTransaction } from './transactions-queries';

interface DuplicateComparisonProps {
  /** A transação do banco marcada como possível duplicata. */
  bankTransaction: Transaction;
  isResolving: boolean;
  onResolve: (action: DuplicateResolution) => void;
}

function ComparisonCard({ label, transaction }: { label: string; transaction: Transaction }) {
  return (
    <div className="min-w-0 space-y-1 rounded-md border bg-card p-3">
      <p className="type-label">{label}</p>
      <p className="text-sm font-medium break-words">{transaction.description}</p>
      <p className="text-sm text-muted-foreground">
        {formatDate(transaction.date)} · {transaction.account.name}
      </p>
      <p className="text-sm text-muted-foreground">
        {transaction.category?.name ?? 'Sem categoria'}
      </p>
      <p
        className={`font-display text-lg font-bold tabular-nums whitespace-nowrap ${amountColorClass(transaction)}`}
      >
        <Money cents={transaction.amountCents} isSigned />
      </p>
    </div>
  );
}

function ManualSide({ manualId }: { manualId: string }) {
  const manual = useTransaction(manualId);
  if (manual.isPending) return <Skeleton className="h-32 rounded-md" />;
  if (!manual.data) {
    return (
      <p role="alert" className="rounded-md border p-3 text-sm text-destructive">
        Não foi possível carregar a transação que você lançou.
      </p>
    );
  }
  return <ComparisonCard label="Lançada por você" transaction={manual.data} />;
}

/** As duas transações lado a lado, com "Juntar" e "São diferentes". Nada é juntado sem você escolher. */
export function DuplicateComparison({
  bankTransaction,
  isResolving,
  onResolve,
}: DuplicateComparisonProps) {
  return (
    <section
      aria-labelledby="duplicate-title"
      className="space-y-3 rounded-lg border border-warning/40 bg-warning-surface p-3"
    >
      <div className="space-y-1">
        <h3 id="duplicate-title" className="font-display text-lg font-semibold text-warning">
          Possível duplicata
        </h3>
        <p className="text-sm text-warning">
          O banco trouxe uma transação parecida com uma que você lançou. Confira e escolha.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ComparisonCard label="Do banco" transaction={bankTransaction} />
        {bankTransaction.possibleDuplicateOfId ? (
          <ManualSide manualId={bankTransaction.possibleDuplicateOfId} />
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button disabled={isResolving} onClick={() => onResolve('merge')}>
          Juntar
        </Button>
        <Button variant="outline" disabled={isResolving} onClick={() => onResolve('keep_both')}>
          São diferentes
        </Button>
      </div>
      <p className="text-sm text-warning">
        Juntar mantém a transação do banco e leva a categoria que você escolheu na sua.
      </p>
    </section>
  );
}
