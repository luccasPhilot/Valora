export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

const WARNING_THRESHOLD_PERCENT = 80;
const FULL_PERCENT = 100;

/**
 * Compara em centavos inteiros (`gasto × 100 < limite × 80`) para os limites exatos de 80% e 100%
 * não sofrerem erro de ponto flutuante.
 */
export function budgetStatus(spentCents: number, limitCents: number): BudgetStatus {
  if (spentCents * FULL_PERCENT < limitCents * WARNING_THRESHOLD_PERCENT) return 'ok';
  if (spentCents <= limitCents) return 'warning';
  return 'exceeded';
}

/** Só para exibir. O status nunca é decidido por este valor. */
export function budgetPercent(spentCents: number, limitCents: number): number {
  return Math.floor((spentCents * FULL_PERCENT) / limitCents);
}
