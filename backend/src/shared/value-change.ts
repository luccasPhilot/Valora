const PERCENT_SCALE = 100;
const TWO_DECIMALS = 100;

export interface ValueChange {
  readonly cents: number;
  /** Nulo quando o valor da primeira foto é zero (não há base para a porcentagem). */
  readonly percent: number | null;
}

export interface ValuePoint {
  /** `AAAA-MM-DD`. */
  readonly date: string;
  readonly cents: number;
}

/**
 * Diferença entre o valor de hoje e o da primeira foto do mês. Sem foto de um dia anterior a hoje,
 * a variação seria sempre zero e enganosa; por isso vem nula.
 */
export function buildValueChange(
  currentCents: number,
  firstPoint: ValuePoint | undefined,
  today: string,
): ValueChange | null {
  if (!firstPoint || firstPoint.date >= today) return null;
  const cents = currentCents - firstPoint.cents;
  if (firstPoint.cents === 0) return { cents, percent: null };
  const ratio = (cents / Math.abs(firstPoint.cents)) * PERCENT_SCALE;
  return { cents, percent: Math.round(ratio * TWO_DECIMALS) / TWO_DECIMALS };
}
