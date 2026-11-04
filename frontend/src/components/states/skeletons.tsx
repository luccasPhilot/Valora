import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_ROW_COUNT = 5;

interface RowsSkeletonProps {
  rowCount?: number;
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4" aria-hidden="true">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}

export function RowsSkeleton({ rowCount = DEFAULT_ROW_COUNT }: RowsSkeletonProps) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <Skeleton key={rowIndex} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function ScreenSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <RowsSkeleton />
    </div>
  );
}
