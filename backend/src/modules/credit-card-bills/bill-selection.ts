import { addMonthsKeepingDay, nextOccurrenceOfDay } from '../../shared/dates.js';
import { type BillStatus, billStatus } from './bill-status.js';

const MAX_UPCOMING_BILLS = 3;

export interface StoredBill {
  readonly id: string;
  readonly dueDate: string;
  readonly closingDate: string | null;
  readonly totalCents: number;
  readonly paidCents: number;
}

export interface BillView {
  /** Nulo na fatura montada a partir do saldo do cartão (não existe em `credit_card_bills`). */
  readonly id: string | null;
  readonly dueDate: string | null;
  /** Vencimento repetido a partir de um dado velho do banco, não informado por ele. */
  readonly isEstimatedDueDate: boolean;
  readonly closingDate: string | null;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly status: BillStatus;
}

export interface SelectedBills {
  readonly current: BillView | null;
  readonly upcoming: readonly BillView[];
}

export interface BalanceFallback {
  readonly balanceCents: number | null;
  /** Vencimento que vem nos dados da conta. Guarda o da última fatura e costuma estar velho. */
  readonly accountDueDate: string | null;
  /** Vencimento da fatura gravada mais recente; nulo se o cartão não tem faturas gravadas. */
  readonly latestBillDueDate: string | null;
}

function toView(bill: StoredBill, today: string): BillView {
  return {
    id: bill.id,
    dueDate: bill.dueDate,
    isEstimatedDueDate: false,
    closingDate: bill.closingDate,
    totalCents: bill.totalCents,
    paidCents: bill.paidCents,
    status: billStatus(bill, today),
  };
}

// O Pluggy só devolve faturas já fechadas: a fatura aberta (a do saldo da conta) não está na lista.
// Atual, nesta ordem: a primeira fatura fechada não paga que vence de hoje em diante; a última
// fatura, se já venceu sem pagamento (só a última: um pagamento parcial antigo não conta). Sem
// nenhuma das duas, quem responde é o saldo da conta (`fallbackCurrentBill`).
function pickCurrent(bills: readonly StoredBill[], today: string): StoredBill | null {
  const firstUnpaidUpcoming = bills.find(
    (bill) => bill.dueDate >= today && billStatus(bill, today) !== 'paid',
  );
  if (firstUnpaidUpcoming) return firstUnpaidUpcoming;
  const latest = bills.at(-1);
  return latest && billStatus(latest, today) === 'overdue' ? latest : null;
}

/**
 * Escolhe a fatura atual e até 3 próximas entre as faturas gravadas do cartão. `current` nulo
 * significa que nenhuma fatura fechada está pendente: use o saldo da conta.
 */
export function selectBills(storedBills: readonly StoredBill[], today: string): SelectedBills {
  const bills = [...storedBills].sort((first, second) =>
    first.dueDate.localeCompare(second.dueDate),
  );
  const current = pickCurrent(bills, today);
  if (!current) return { current: null, upcoming: [] };
  const upcoming = bills
    .filter((bill) => bill.dueDate > current.dueDate)
    .slice(0, MAX_UPCOMING_BILLS)
    .map((bill) => toView(bill, today));
  return { current: toView(current, today), upcoming };
}

interface ResolvedDueDate {
  readonly dueDate: string | null;
  readonly isEstimated: boolean;
}

// A fatura aberta vence um mês depois da última fechada; se esse dia já passou, o dia do mês se repete a partir de hoje.
function estimateFromLatestBill(latestBillDueDate: string, today: string): ResolvedDueDate {
  const nextDueDate = addMonthsKeepingDay(latestBillDueDate, 1);
  const dueDate = nextDueDate >= today ? nextDueDate : nextOccurrenceOfDay(nextDueDate, today);
  return { dueDate, isEstimated: true };
}

// Sem faturas gravadas, vale o vencimento dos dados da conta: é o da última fatura e costuma estar velho.
function resolveFromAccount(accountDueDate: string | null, today: string): ResolvedDueDate {
  if (accountDueDate === null) return { dueDate: null, isEstimated: false };
  if (accountDueDate >= today) return { dueDate: accountDueDate, isEstimated: false };
  return { dueDate: nextOccurrenceOfDay(accountDueDate, today), isEstimated: true };
}

function resolveDueDate(fallback: BalanceFallback, today: string): ResolvedDueDate {
  if (fallback.latestBillDueDate !== null) {
    return estimateFromLatestBill(fallback.latestBillDueDate, today);
  }
  return resolveFromAccount(fallback.accountDueDate, today);
}

/**
 * Fatura atual a partir do saldo da conta, para o cartão sem fatura fechada pendente (ou sem
 * faturas gravadas). Nunca inventa as próximas. Fatura zerada não precisa de vencimento.
 */
export function fallbackCurrentBill(fallback: BalanceFallback, today: string): BillView | null {
  const { balanceCents } = fallback;
  if (balanceCents === null) return null;
  const { dueDate, isEstimated } =
    balanceCents > 0 ? resolveDueDate(fallback, today) : { dueDate: null, isEstimated: false };
  return {
    id: null,
    dueDate,
    isEstimatedDueDate: isEstimated,
    closingDate: null,
    totalCents: balanceCents,
    paidCents: 0,
    status: billStatus({ totalCents: balanceCents, paidCents: 0, dueDate }, today),
  };
}
