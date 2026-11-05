import { cn } from 'cn';
import * as React from 'react';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-sm leading-5 font-medium text-foreground', className)}
      {...props}
    />
  );
}

export { Label };
