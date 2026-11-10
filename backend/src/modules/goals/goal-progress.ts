const FULL_PERCENT = 100;

/**
 * Percentual do valor desejado, limitado a 100. Só inteiros: `floor` deixa 99% para quem
 * ainda falta R$ 0,01, e a meta acima do valor desejado aparece 100%.
 */
export function goalProgress(savedCents: number, targetCents: number): number {
  return Math.min(FULL_PERCENT, Math.floor((savedCents * FULL_PERCENT) / targetCents));
}
