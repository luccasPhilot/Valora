export type BillStatus = 'open' | 'paid' | 'overdue';

export interface BillForStatus {
  readonly totalCents: number;
  readonly paidCents: number;
  /** Nulo quando o banco não informa o vencimento: sem data, a fatura nunca está vencida. */
  readonly dueDate: string | null;
}

/** `today` é a data de São Paulo (AAAA-MM-DD). Vencer hoje ainda é "aberta". */
export function billStatus(bill: BillForStatus, today: string): BillStatus {
  // Total zero ou negativo (crédito) não tem o que pagar.
  if (bill.totalCents <= 0 || bill.paidCents >= bill.totalCents) return 'paid';
  if (bill.dueDate !== null && bill.dueDate < today) return 'overdue';
  return 'open';
}
