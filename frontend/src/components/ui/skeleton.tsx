import { cn } from 'cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted-foreground/25 dark:bg-accent', className)}
      {...props}
    />
  );
}

export { Skeleton };
