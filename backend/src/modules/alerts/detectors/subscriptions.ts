import { daysBetween } from '../../../shared/dates.js';
import type { AlertSituation } from '../alert-situations.js';
import { type ChargeRow, groupByKey, isPatternCharge, messageDescription } from './charge-row.js';

const MIN_SEQUENCE_LENGTH = 3;
const MIN_INTERVAL_DAYS = 25;
const MAX_INTERVAL_DAYS = 35;
const MAX_DAYS_SINCE_LAST_CHARGE = 45;

export function subscriptionDedupeKey(amountCents: number, descriptionNormalized: string): string {
  return `subscription_detected:${amountCents}:${descriptionNormalized}`;
}

/** Uma assinatura ativa: a sequência mensal mais recente de um mesmo valor e descrição. */
export interface ActiveSubscription {
  readonly latestCharge: ChargeRow;
  /** Valor da cobrança, positivo. */
  readonly amountCents: number;
  readonly chargesCount: number;
}

/**
 * Assinatura: 3 ou mais cobranças de mesmo valor e descrição (em qualquer conta) em sequência, com 25 a
 * 35 dias entre cada par consecutivo, e a última com até 45 dias (`today` é AAAA-MM-DD). Uma por
 * descrição e valor, com a sequência ativa mais recente. É a única definição de assinatura: o alerta
 * e a análise de categorias leem daqui.
 */
export function findActiveSubscriptions(
  rows: readonly ChargeRow[],
  today: string,
): ActiveSubscription[] {
  const groups = groupByKey(
    rows.filter(isPatternCharge),
    (row) => `${row.amountCents}|${row.descriptionNormalized}`,
  );
  return groups.flatMap((group) => {
    const sequence = activeSequences(group, today).at(-1);
    const latestCharge = sequence?.at(-1);
    if (!sequence || !latestCharge) return [];
    return [
      { latestCharge, amountCents: -latestCharge.amountCents, chargesCount: sequence.length },
    ];
  });
}

/** Uma situação por assinatura ativa, ligada à cobrança mais recente. */
export function detectSubscriptions(rows: readonly ChargeRow[], today: string): AlertSituation[] {
  return findActiveSubscriptions(rows, today).map((subscription) =>
    subscriptionSituation(subscription.latestCharge),
  );
}

/** Sequências mensais (3 ou mais cobranças) cuja última cobrança ainda é recente, da mais antiga à mais nova. */
function activeSequences(sortedCharges: readonly ChargeRow[], today: string): ChargeRow[][] {
  const sequences: ChargeRow[][] = [];
  let current: ChargeRow[] = [];
  for (const charge of sortedCharges) {
    const previous = current.at(-1);
    const isNextMonthly = previous !== undefined && isMonthlyInterval(previous.date, charge.date);
    if (isNextMonthly) current.push(charge);
    else {
      sequences.push(current);
      current = [charge];
    }
  }
  sequences.push(current);
  return sequences.filter((sequence) => isActiveSubscription(sequence, today));
}

function isMonthlyInterval(from: string, to: string): boolean {
  const days = daysBetween(from, to);
  return days >= MIN_INTERVAL_DAYS && days <= MAX_INTERVAL_DAYS;
}

function isActiveSubscription(sequence: readonly ChargeRow[], today: string): boolean {
  const last = sequence.at(-1);
  if (!last || sequence.length < MIN_SEQUENCE_LENGTH) return false;
  return daysBetween(last.date, today) <= MAX_DAYS_SINCE_LAST_CHARGE;
}

function subscriptionSituation(latestCharge: ChargeRow): AlertSituation {
  return {
    type: 'subscription_detected',
    dedupeKey: subscriptionDedupeKey(latestCharge.amountCents, latestCharge.descriptionNormalized),
    message: `Assinatura detectada: ${messageDescription(latestCharge.description)}`,
    categoryId: null,
    connectionId: null,
    transactionId: latestCharge.id,
  };
}
