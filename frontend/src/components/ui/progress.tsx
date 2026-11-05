import { cn } from 'cn';
import { Progress as ProgressPrimitive } from 'radix-ui';
import * as React from 'react';

const FULL_PERCENT = 100;

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** Classe da cor do preenchimento (por exemplo, `bg-status-ok`). */
  indicatorClassName?: string;
}

// Trilho `track`; a cor do preenchimento vem de quem usa. O valor acima de 100 não passa do trilho.
function Progress({ className, indicatorClassName, value = 0, ...props }: ProgressProps) {
  const filledPercent = Math.min(Math.max(value ?? 0, 0), FULL_PERCENT);
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={filledPercent}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-track', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'h-full w-full rounded-full transition-transform motion-reduce:transition-none',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${FULL_PERCENT - filledPercent}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
