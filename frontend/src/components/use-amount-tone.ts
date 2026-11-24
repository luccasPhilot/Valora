import { useHideValues } from './hide-values-provider';

/**
 * Como a cor de um valor é escolhida (Design System, "Valores financeiros"):
 * - `flow`: entrada em `positive`; saída na cor normal;
 * - `balance`: saldo negativo em `destructive`; positivo na cor normal;
 * - `result`: sobra em `positive`; falta em `destructive`.
 */
export type AmountToneKind = 'flow' | 'balance' | 'result';

const NORMAL_TONE = '';
const POSITIVE_TONE = 'text-positive';
const DESTRUCTIVE_TONE = 'text-destructive';

function toneFor(cents: number, kind: AmountToneKind): string {
  if (cents > 0 && kind !== 'balance') return POSITIVE_TONE;
  if (cents < 0 && kind !== 'flow') return DESTRUCTIVE_TONE;
  return NORMAL_TONE;
}

/** A classe de cor de um valor. Com os valores ocultos, sempre a cor normal: a cor não pode revelar o sinal. */
export function useAmountTone(cents: number, kind: AmountToneKind): string {
  const { areValuesHidden } = useHideValues();
  if (areValuesHidden) return NORMAL_TONE;
  return toneFor(cents, kind);
}
