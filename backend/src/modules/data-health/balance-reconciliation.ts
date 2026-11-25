import { subtractDays } from '../../shared/dates.js';

/** Quantos dias para trás a conciliação olha. */
export const RECONCILIATION_LOOKBACK_DAYS = 60;
// Transação lançada com atraso muda o passado: só confere o par cuja foto mais recente já assentou.
const SETTLE_DAYS = 3;

export interface ReconciliationSnapshot {
  /** AAAA-MM-DD */
  readonly date: string;
  readonly balanceCents: number;
}

export interface ReconciliationTransaction {
  /** AAAA-MM-DD */
  readonly date: string;
  readonly amountCents: number;
  readonly status: 'pending' | 'posted';
  readonly source: 'open_finance' | 'manual';
}

export interface ReconciliationInput {
  readonly accountId: string;
  readonly snapshots: readonly ReconciliationSnapshot[];
  readonly transactions: readonly ReconciliationTransaction[];
  /** AAAA-MM-DD, em São Paulo. */
  readonly today: string;
}

export interface BalanceDivergence {
  readonly accountId: string;
  readonly from: string;
  readonly to: string;
  /** Variação das fotos menos a soma das transações do período. */
  readonly differenceCents: number;
}

interface PeriodResidual {
  readonly from: string;
  readonly to: string;
  readonly residualCents: number;
}

/**
 * Compara a variação entre fotos seguidas com as transações postadas do Open Finance em `[d1, d2)`:
 * a foto de um dia ainda não tem as transações daquele dia (conferido com dados reais, veja o design).
 * Períodos seguidos com diferença viram um só; os que se anulam (transação no dia errado) somem.
 */
export function reconcileBalances(input: ReconciliationInput): BalanceDivergence[] {
  const residuals = periodResiduals(input);
  return joinConsecutive(residuals)
    .filter((period) => period.residualCents !== 0)
    .map(({ from, to, residualCents }) => ({
      accountId: input.accountId,
      from,
      to,
      differenceCents: residualCents,
    }));
}

function periodResiduals({
  snapshots,
  transactions,
  today,
}: ReconciliationInput): PeriodResidual[] {
  const oldest = subtractDays(today, RECONCILIATION_LOOKBACK_DAYS);
  const newest = subtractDays(today, SETTLE_DAYS);
  const counted = transactions.filter(
    (transaction) => transaction.status === 'posted' && transaction.source === 'open_finance',
  );
  const sorted = [...snapshots].sort((left, right) => left.date.localeCompare(right.date));
  return sorted.slice(1).flatMap((latest, index) => {
    const earlier = sorted[index];
    if (!earlier || earlier.date < oldest || latest.date > newest) return [];
    const transactionsCents = sumBetween(counted, earlier.date, latest.date);
    const residualCents = latest.balanceCents - earlier.balanceCents - transactionsCents;
    return [{ from: earlier.date, to: latest.date, residualCents }];
  });
}

/** Soma das transações com data em `[from, to)`. */
function sumBetween(
  transactions: readonly ReconciliationTransaction[],
  from: string,
  to: string,
): number {
  return transactions
    .filter((transaction) => transaction.date >= from && transaction.date < to)
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

/**
 * Junta os períodos seguidos (o fim de um é o começo do outro) que têm diferença. Um período que
 * bateu fica entre os dois e os separa.
 */
function joinConsecutive(residuals: readonly PeriodResidual[]): PeriodResidual[] {
  const joined: PeriodResidual[] = [];
  for (const period of residuals) {
    if (period.residualCents === 0) continue;
    const previous = joined.at(-1);
    if (previous?.to === period.from) {
      joined[joined.length - 1] = {
        from: previous.from,
        to: period.to,
        residualCents: previous.residualCents + period.residualCents,
      };
    } else {
      joined.push(period);
    }
  }
  return joined;
}
