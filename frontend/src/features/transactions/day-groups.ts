import type { Transaction } from '@/lib/api/transactions';

export interface DayGroup {
  readonly date: string;
  readonly transactions: readonly Transaction[];
  /** Soma do dia sem as transferências, que ficam fora de todos os totais. */
  readonly totalCents: number;
}

export function isTransfer(transaction: Transaction): boolean {
  return transaction.category?.kind === 'transfer';
}

/** Agrupa mantendo a ordem recebida (a API já entrega da data mais recente para a mais antiga). */
export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const group = groups.get(transaction.date);
    if (group) group.push(transaction);
    else groups.set(transaction.date, [transaction]);
  }
  return [...groups].map(([date, dayTransactions]) => ({
    date,
    transactions: dayTransactions,
    totalCents: dayTransactions
      .filter((transaction) => !isTransfer(transaction))
      .reduce((sum, transaction) => sum + transaction.amountCents, 0),
  }));
}
