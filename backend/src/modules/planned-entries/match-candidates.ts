import { daysBetween } from '../../shared/dates.js';

export const MAX_MATCH_CANDIDATES = 5;
const MATCH_WINDOW_DAYS = 7;
const VALUE_TOLERANCE_PERCENT = 20;
const PERCENT_BASE = 100;
const MONTH_PREFIX_LENGTH = 7;

export interface OccurrenceToMatch {
  /** Data prevista, AAAA-MM-DD. */
  readonly date: string;
  /** Com sinal: negativo = despesa prevista. */
  readonly amountCents: number;
  readonly categoryId: string;
}

export interface CandidateTransaction {
  readonly id: string;
  readonly date: string;
  readonly amountCents: number;
  readonly categoryId: string | null;
  /** Já vinculada a outra ocorrência. */
  readonly isLinked: boolean;
}

function hasSameSign(first: number, second: number): boolean {
  return Math.sign(first) === Math.sign(second);
}

// Em inteiros, sem divisão: |real − previsto| ≤ 20% do previsto. Exatos 20% entram.
function isWithinValueTolerance(plannedCents: number, actualCents: number): boolean {
  const difference = Math.abs(Math.abs(actualCents) - Math.abs(plannedCents));
  return difference * PERCENT_BASE <= Math.abs(plannedCents) * VALUE_TOLERANCE_PERCENT;
}

function isCandidate(occurrence: OccurrenceToMatch, transaction: CandidateTransaction): boolean {
  if (transaction.isLinked) return false;
  if (!hasSameSign(occurrence.amountCents, transaction.amountCents)) return false;
  if (
    transaction.date.slice(0, MONTH_PREFIX_LENGTH) !== occurrence.date.slice(0, MONTH_PREFIX_LENGTH)
  ) {
    return false;
  }
  if (Math.abs(daysBetween(occurrence.date, transaction.date)) > MATCH_WINDOW_DAYS) return false;
  const hasSameCategory = transaction.categoryId === occurrence.categoryId;
  return hasSameCategory || isWithinValueTolerance(occurrence.amountCents, transaction.amountCents);
}

function valueDistance(occurrence: OccurrenceToMatch, transaction: CandidateTransaction): number {
  return Math.abs(Math.abs(transaction.amountCents) - Math.abs(occurrence.amountCents));
}

function dateDistance(occurrence: OccurrenceToMatch, transaction: CandidateTransaction): number {
  return Math.abs(daysBetween(occurrence.date, transaction.date));
}

/**
 * Transações que podem ser a realização da ocorrência: do mesmo mês, com o mesmo sinal, a até 7 dias
 * da data prevista, com a mesma categoria ou valor dentro de 20%, e ainda sem vínculo. Vêm da mais
 * próxima no valor para a mais distante, depois pela data; no máximo 5. Só sugere: nunca vincula.
 */
export function rankMatchCandidates<T extends CandidateTransaction>(
  occurrence: OccurrenceToMatch,
  transactions: readonly T[],
): T[] {
  return transactions
    .filter((transaction) => isCandidate(occurrence, transaction))
    .sort(
      (first, second) =>
        valueDistance(occurrence, first) - valueDistance(occurrence, second) ||
        dateDistance(occurrence, first) - dateDistance(occurrence, second) ||
        first.date.localeCompare(second.date),
    )
    .slice(0, MAX_MATCH_CANDIDATES);
}
