import { addMonthsKeepingDay, firstDayOfMonth } from '../../shared/dates.js';

const PROJECTION_MONTHS = 12;

/** Transação parcelada de UM cartão. */
export interface InstallmentTransaction {
  readonly descriptionNormalized: string;
  readonly date: string;
  /** Negativo: compra. Estornos (positivos) não geram parcelas. */
  readonly amountCents: number;
  readonly installmentNumber: number;
  readonly installmentTotal: number;
}

export interface InstallmentMonth {
  /** Dia 1 do mês, AAAA-MM-DD. */
  readonly month: string;
  /** Soma das parcelas previstas, positiva: é o que vai sair. */
  readonly totalCents: number;
}

// O valor fica fora da chave: as parcelas de uma mesma compra variam em centavos (60,00 e 59,98).
function purchaseKey(transaction: InstallmentTransaction): string {
  return `${transaction.descriptionNormalized}|${String(transaction.installmentTotal)}`;
}

function isLaterInstallment(candidate: InstallmentTransaction, current: InstallmentTransaction) {
  if (candidate.installmentNumber !== current.installmentNumber) {
    return candidate.installmentNumber > current.installmentNumber;
  }
  return candidate.date > current.date;
}

function latestInstallmentOfEachPurchase(
  transactions: readonly InstallmentTransaction[],
): InstallmentTransaction[] {
  const anchors = new Map<string, InstallmentTransaction>();
  for (const transaction of transactions) {
    if (transaction.installmentTotal <= 1 || transaction.amountCents >= 0) continue;
    const key = purchaseKey(transaction);
    const anchor = anchors.get(key);
    if (!anchor || isLaterInstallment(transaction, anchor)) anchors.set(key, transaction);
  }
  return [...anchors.values()];
}

/**
 * Parcelas que ainda virão, somadas por mês, do mês de `today` até 12 meses à frente. Cada compra
 * parte da parcela de maior número já recebida e projeta o resto, uma por mês, com o valor dela.
 * Parcela projetada para um mês que já passou não entra: se não veio, o banco não a cobrou.
 */
export function projectFutureInstallments(
  transactions: readonly InstallmentTransaction[],
  today: string,
): InstallmentMonth[] {
  const firstMonth = firstDayOfMonth(today);
  const lastMonth = firstDayOfMonth(addMonthsKeepingDay(firstMonth, PROJECTION_MONTHS - 1));
  const totalsByMonth = new Map<string, number>();
  for (const anchor of latestInstallmentOfEachPurchase(transactions)) {
    const remaining = anchor.installmentTotal - anchor.installmentNumber;
    for (let offset = 1; offset <= remaining; offset += 1) {
      const month = firstDayOfMonth(addMonthsKeepingDay(anchor.date, offset));
      if (month < firstMonth || month > lastMonth) continue;
      totalsByMonth.set(month, (totalsByMonth.get(month) ?? 0) - anchor.amountCents);
    }
  }
  return [...totalsByMonth.entries()]
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([month, totalCents]) => ({ month, totalCents }));
}
