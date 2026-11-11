import { CalendarClock, CircleAlert } from 'lucide-react';
import { Link } from 'react-router';

import { Metric } from '@/components/cards/metric';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { DashboardProjection } from '@/lib/api/dashboard';

import { describeNegativeBalance } from '../planning/projection/projection-labels';
import { DashboardSection, SectionEmpty, SectionLink } from './dashboard-section';

const PLANNING_PATH = '/planejamento';

function ProjectionEmpty() {
  return (
    <SectionEmpty
      message="Nada previsto até o fim do mês."
      action={
        <Button asChild variant="outline">
          <Link to={PLANNING_PATH}>Planeje o mês</Link>
        </Button>
      }
    />
  );
}

function ProjectionValue({ projection }: { projection: DashboardProjection }) {
  const negativeWarning = describeNegativeBalance(projection);
  return (
    <div className="min-w-0 space-y-3">
      <Metric
        value={<Money cents={projection.projectedBalanceCents} />}
        caption="Saldo projetado no fim do mês"
        isNegative={projection.projectedBalanceCents < 0}
      />
      {negativeWarning ? (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {negativeWarning}
        </p>
      ) : null}
    </div>
  );
}

/** O saldo projetado do fim do mês, o mesmo número do Planejamento; o aviso só aparece com saldo negativo no caminho. */
export function ProjectionCard({ projection }: { projection: DashboardProjection }) {
  return (
    <DashboardSection
      title="Projeção do fim do mês"
      icon={CalendarClock}
      action={
        projection.hasPlannedItems ? (
          <SectionLink to={PLANNING_PATH}>Ver planejamento</SectionLink>
        ) : undefined
      }
    >
      {projection.hasPlannedItems ? (
        <ProjectionValue projection={projection} />
      ) : (
        <ProjectionEmpty />
      )}
    </DashboardSection>
  );
}
