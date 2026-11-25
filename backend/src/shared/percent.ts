const PERCENT_SCALE = 1000;
const PERCENT_DECIMALS_DIVISOR = 10;

/**
 * `parte ÷ total × 100` com uma casa decimal, calculado em inteiros. Zero quando o total é zero ou
 * negativo (não há base), e nunca `-0`, para a tela não mostrar "−0%".
 */
export function percentWithOneDecimal(partCents: number, totalCents: number): number {
  if (totalCents <= 0) return 0;
  const percent = Math.round((partCents * PERCENT_SCALE) / totalCents) / PERCENT_DECIMALS_DIVISOR;
  return percent === 0 ? 0 : percent;
}
