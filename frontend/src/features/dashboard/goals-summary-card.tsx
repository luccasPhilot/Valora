import { Flag, Plus } from 'lucide-react';
import { Link } from 'react-router';

import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { DashboardGoal } from '@/lib/api/dashboard';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { GoalStatusLine } from '../goals/goal-status-line';
import { DashboardSection, SectionEmpty, SectionLink } from './dashboard-section';

const GOALS_PATH = '/metas';

function GoalRow({ goal }: { goal: DashboardGoal }) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <CategoryBadgeIcon name={goal.icon} />
        <p className="min-w-0 flex-1 font-medium break-words">{goal.name}</p>
        <p className="shrink-0 text-sm text-muted-foreground tabular-nums">{goal.percent}%</p>
      </div>
      <Progress
        value={goal.percent}
        aria-label={`${goal.name}: ${goal.percent}% do valor desejado`}
        indicatorClassName="bg-primary"
      />
      <p className="text-sm tabular-nums">
        <Money cents={goal.savedCents} isTrimmed /> de <Money cents={goal.targetCents} isTrimmed />
      </p>
      <GoalStatusLine goal={goal} />
    </li>
  );
}

/** Até 3 metas não concluídas, na ordem da tela de Metas, com a situação sempre em ícone e texto. */
export function GoalsSummaryCard({ goals }: { goals: readonly DashboardGoal[] }) {
  return (
    <DashboardSection
      title="Metas"
      icon={Flag}
      action={goals.length > 0 ? <SectionLink to={GOALS_PATH}>Ver metas</SectionLink> : undefined}
    >
      {goals.length === 0 ? (
        <SectionEmpty
          message="Nenhuma meta em andamento"
          action={
            <Button asChild variant="outline">
              <Link to={GOALS_PATH}>
                <Plus aria-hidden="true" />
                Criar meta
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-5">
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
