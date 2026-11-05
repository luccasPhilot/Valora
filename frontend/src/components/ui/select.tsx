import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

// Select nativo: no celular abre o seletor do sistema, que é o mais fácil de usar com uma mão.
function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          'h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent py-1 pr-10 pl-3 text-base shadow-xs outline-none disabled:pointer-events-none disabled:opacity-50 lg:text-sm dark:bg-input/30',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'aria-invalid:border-destructive',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}

export { Select };
