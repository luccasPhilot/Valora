import type {
  LinkedTransaction,
  MonthTotals,
  PlannedEntry,
  PlannedOccurrence,
  Recurrence,
} from '@/lib/api/planned-entries';
import { formatDate, formatMonth, formatMonthName } from '@/lib/format';

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Não repete' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
] as const;

export function parseRecurrence(value: string): Recurrence | undefined {
  return RECURRENCE_OPTIONS.find((option) => option.value === value)?.value;
}

/** "Uma vez, dia 10", "Todo mês, dia 5", "Todo mês, dia 5, até dezembro de 2026" ou "Todo ano, em mar., dia 10". */
export function describeRecurrence(entry: PlannedEntry): string {
  const day = `dia ${String(entry.dayOfMonth)}`;
  if (entry.recurrence === 'none') return `Uma vez, ${day}`;
  if (entry.recurrence === 'yearly') {
    return `Todo ano, em ${formatMonthName(entry.startMonth)}, ${day}`;
  }
  const monthly = `Todo mês, ${day}`;
  return entry.endMonth ? `${monthly}, até ${formatMonth(`${entry.endMonth}-01`)}` : monthly;
}

/** Quanto se espera no mês: o que ainda vai acontecer mais o que já aconteceu. Puladas ficam de fora. */
export function expectedTotals(totals: MonthTotals) {
  return {
    incomeCents: totals.pending.incomeCents + totals.realized.incomeCents,
    expenseCents: totals.pending.expenseCents + totals.realized.expenseCents,
  };
}

export function describeLinkedTransaction(transaction: LinkedTransaction): string {
  return `${transaction.description} · ${formatDate(transaction.date)}`;
}

/** Frase curta do que aconteceu com uma ocorrência realizada. */
export function describeRealization(occurrence: PlannedOccurrence): string {
  return occurrence.transaction
    ? `Vinculada a ${describeLinkedTransaction(occurrence.transaction)}`
    : 'Realizada sem transação vinculada';
}

export const ENTRY_EDIT_WARNING =
  'A mudança vale para todos os meses, inclusive os já realizados. Para mudar só daqui para frente, defina o mês de fim desta previsão e crie outra.';
