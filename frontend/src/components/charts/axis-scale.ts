const NICE_STEP_FACTORS = [1, 2, 2.5, 5, 10] as const;
const TARGET_INTERVALS = 4;
/** Eixo mínimo de R$ 100: com dados todos em zero, o eixo ainda tem altura. */
const MIN_SPAN_CENTS = 10000;

export interface ValueAxisScale {
  readonly domain: [number, number];
  readonly ticks: number[];
}

/** Os dois extremos de uma coluna empilhada: a soma dos negativos (para baixo) e a dos positivos. */
export function stackExtremes(values: readonly number[]): [number, number] {
  const negativeSum = values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0);
  const positiveSum = values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  return [negativeSum, positiveSum];
}

/**
 * Eixo vertical em centavos com valores redondos (R$ 1 mil, R$ 2 mil...) em vez dos múltiplos
 * quebrados que o Recharts sorteia (R$ 850, R$ 1,7 mil...). O zero sempre entra: é a linha que
 * separa o que sobrou do que faltou. `values` são os extremos de cada coluna ou ponto do gráfico.
 */
export function niceValueAxis(values: readonly number[]): ValueAxisScale {
  const lowest = Math.min(0, ...values);
  const highest = Math.max(0, ...values);
  const roughStep = Math.max(highest - lowest, MIN_SPAN_CENTS) / TARGET_INTERVALS;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const factor = NICE_STEP_FACTORS.find((candidate) => candidate * magnitude >= roughStep) ?? 10;
  const step = factor * magnitude;
  const start = Math.floor(lowest / step) * step;
  const end = Math.max(Math.ceil(highest / step) * step, start + step);
  const ticks: number[] = [];
  for (let tick = start; tick <= end; tick += step) ticks.push(Math.round(tick));
  return { domain: [Math.round(start), Math.round(end)], ticks };
}
