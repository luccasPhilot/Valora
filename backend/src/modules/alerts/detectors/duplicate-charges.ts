import { daysBetween } from '../../../shared/dates.js';
import type { AlertSituation } from '../alert-situations.js';
import { type ChargeRow, groupByKey, isPatternCharge, messageDescription } from './charge-row.js';

const DUPLICATE_WINDOW_DAYS = 3;
const RECENT_CHARGE_DAYS = 7;

export function duplicateChargeDedupeKey(transactionId: string): string {
  return `duplicate_charge:${transactionId}`;
}

/**
 * Cobrança duplicada: outra saída postada na mesma conta, com a mesma descrição e o mesmo valor,
 * até 3 dias antes. O alerta é da mais recente do par; três cobranças iguais geram dois alertas.
 * Só olha cobranças dos últimos 7 dias (`today` é AAAA-MM-DD).
 */
export function detectDuplicateCharges(
  rows: readonly ChargeRow[],
  today: string,
): AlertSituation[] {
  const groups = groupByKey(
    rows.filter(isPatternCharge),
    (row) => `${row.accountId}|${row.amountCents}|${row.descriptionNormalized}`,
  );
  return groups.flatMap((group) =>
    group.flatMap((charge, index) => {
      const previous = group[index - 1];
      if (!previous) return [];
      if (daysBetween(charge.date, today) > RECENT_CHARGE_DAYS) return [];
      if (daysBetween(previous.date, charge.date) > DUPLICATE_WINDOW_DAYS) return [];
      return [duplicateChargeSituation(charge)];
    }),
  );
}

function duplicateChargeSituation(charge: ChargeRow): AlertSituation {
  return {
    type: 'duplicate_charge',
    dedupeKey: duplicateChargeDedupeKey(charge.id),
    message: `Possível cobrança duplicada: ${messageDescription(charge.description)}`,
    categoryId: null,
    connectionId: null,
    transactionId: charge.id,
  };
}
