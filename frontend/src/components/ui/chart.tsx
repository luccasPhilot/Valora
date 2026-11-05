import { cn } from 'cn';
import * as React from 'react';
import { ResponsiveContainer } from 'recharts';

// Valor inicial de largura e altura: o jsdom (testes) e a primeira pintura não medem o container.
const INITIAL_DIMENSION = { width: 320, height: 200 } as const;

interface ChartContainerProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Altura fixa por faixa de tela (Design System): ela vem no `className`, por exemplo `h-48 lg:h-60`. */
  children: React.ComponentProps<typeof ResponsiveContainer>['children'];
}

// Base do shadcn/ui para os gráficos do Recharts. As cores das séries vêm dos tokens `chart-*`
// (variáveis CSS, que mudam com o tema), nunca de hex; eixos e grade usam `muted-foreground`.
function ChartContainer({ className, children, ...props }: ChartContainerProps) {
  return (
    <div
      data-slot="chart"
      className={cn(
        'w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden',
        className,
      )}
      {...props}
    >
      <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>{children}</ResponsiveContainer>
    </div>
  );
}

export { ChartContainer };
