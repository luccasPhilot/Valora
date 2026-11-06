import type { Bill } from '@/lib/api/credit-card-bills';
import { formatDate } from '@/lib/format';

export const MISSING_DUE_DATE_TEXT = 'Vencimento não informado pelo banco';
export const ESTIMATED_DUE_DATE_HINT =
  'O banco ainda não informou a data desta fatura. O Valora repetiu o dia de vencimento da última.';

/**
 * Frase do vencimento: "Vence em 10/11/2026", "Venceu em …", "Vencimento estimado: …" ou o aviso de
 * que o banco não informou. Fatura sem nada a pagar não precisa de vencimento.
 */
export function describeDueDate(bill: Bill): string | null {
  if (bill.dueDate === null) return bill.totalCents > 0 ? MISSING_DUE_DATE_TEXT : null;
  const date = formatDate(bill.dueDate);
  if (bill.isEstimatedDueDate) return `Vencimento estimado: ${date}`;
  return bill.status === 'overdue' ? `Venceu em ${date}` : `Vence em ${date}`;
}

/** Valor já pago, só enquanto a fatura não está quitada (pagamento parcial). */
export function hasPartialPayment(bill: Bill): boolean {
  return bill.paidCents > 0 && bill.status !== 'paid';
}
