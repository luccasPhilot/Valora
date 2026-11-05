import { Money } from '@/components/money';

export interface TooltipRow {
  readonly label: string;
  readonly cents: number;
  /** Cor da marca da série (variável CSS do token `chart-*`); o texto nunca usa a cor da série. */
  readonly color: string;
}

interface ChartTooltipCardProps {
  title: string;
  rows: readonly TooltipRow[];
}

/** Tooltip dos gráficos do Início: título e valores em R$, que respeitam "ocultar valores". */
export function ChartTooltipCard({ title, rows }: ChartTooltipCardProps) {
  return (
    <div className="min-w-40 space-y-1.5 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-overlay">
      <p className="font-semibold">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            {row.label}
          </span>
          <span className="font-semibold tabular-nums whitespace-nowrap">
            <Money cents={row.cents} />
          </span>
        </p>
      ))}
    </div>
  );
}
