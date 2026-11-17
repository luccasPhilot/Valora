import { Line, LineChart, YAxis } from 'recharts';

import { useHideValues } from '@/components/hide-values-provider';

import { describeTrend } from './analysis-labels';

const MIN_POINTS = 2;
const WIDTH_PX = 72;
const HEIGHT_PX = 28;
const LINE_WIDTH_PX = 2;
const MARGIN = { top: 3, right: 3, bottom: 3, left: 3 } as const;

interface CategoryTrendSparklineProps {
  name: string;
  /** `AAAA-MM`. */
  months: readonly string[];
  monthlyCents: readonly number[];
}

/**
 * Linha dos últimos meses da categoria, sem eixos e numa série só (slot 1 da paleta). Só desenha com
 * 2 ou mais meses de histórico; o resumo em texto diz o valor de cada mês.
 */
export function CategoryTrendSparkline({
  name,
  months,
  monthlyCents,
}: CategoryTrendSparklineProps) {
  const { areValuesHidden } = useHideValues();
  if (months.length < MIN_POINTS) return null;
  const points = months.map((month, index) => ({ month, cents: monthlyCents[index] ?? 0 }));
  return (
    <span
      role="img"
      aria-label={describeTrend(name, months, monthlyCents, areValuesHidden)}
      className="inline-block shrink-0"
    >
      <LineChart
        accessibilityLayer={false}
        width={WIDTH_PX}
        height={HEIGHT_PX}
        data={points}
        margin={MARGIN}
      >
        <YAxis hide domain={[0, 'dataMax']} />
        <Line
          type="monotone"
          dataKey="cents"
          stroke="var(--color-chart-1)"
          strokeWidth={LINE_WIDTH_PX}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </span>
  );
}
