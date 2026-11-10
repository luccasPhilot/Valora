import { ChartLine, TriangleAlert } from 'lucide-react';
import { useId } from 'react';

import { ErrorState } from '@/components/states/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Projection } from '@/lib/api/projection';

import { ProjectionChart } from './projection-chart';
import { ProjectionEvents } from './projection-events';
import { PROJECTION_NOT_COVERED_TEXT } from './projection-labels';
import { useProjection } from './projection-queries';
import { ProjectionSummary } from './projection-summary';

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar a projeção.';

function ProjectionWarnings({ warnings }: { warnings: readonly string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="space-y-2">
      {warnings.map((warning) => (
        <li
          key={warning}
          className="flex items-start gap-2 rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {warning}
        </li>
      ))}
    </ul>
  );
}

function ProjectionContent({ projection }: { projection: Projection }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 space-y-5 rounded-xl border bg-card p-4 shadow-card sm:p-5"
    >
      <h2 id={titleId} className="type-label flex items-center gap-2">
        <ChartLine className="size-4 shrink-0 text-primary" aria-hidden="true" />
        Projeção do fim do mês
      </h2>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <ProjectionSummary projection={projection} />
        <ProjectionChart projection={projection} />
      </div>
      <ProjectionWarnings warnings={projection.warnings} />
      <p className="text-sm text-muted-foreground">{PROJECTION_NOT_COVERED_TEXT}</p>
      <ProjectionEvents events={projection.events} />
    </section>
  );
}

function ProjectionSkeleton() {
  return (
    <div role="status" aria-label="Carregando a projeção">
      <Skeleton className="h-96 w-full rounded-xl lg:h-80" />
    </div>
  );
}

/** Projeção do fim do mês no topo do Planejamento. Carrega e falha sem afetar o resto da tela. */
export function ProjectionBlock() {
  const projectionQuery = useProjection();
  if (projectionQuery.isPending) return <ProjectionSkeleton />;
  if (projectionQuery.isError) {
    return (
      <ErrorState message={LOAD_ERROR_MESSAGE} onRetry={() => void projectionQuery.refetch()} />
    );
  }
  return <ProjectionContent projection={projectionQuery.data} />;
}
