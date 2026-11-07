import { CircleCheck, Clock, type LucideIcon, TrendingUp, TriangleAlert } from 'lucide-react';

import { Money } from '@/components/money';
import type { Goal, GoalStatus } from '@/lib/api/goals';

import { COMPLETED_LABEL, formatEstimatedMonth, NO_PACE_LABEL, TOO_FAR_LABEL } from './goal-labels';

interface StatusDisplay {
  readonly icon: LucideIcon;
  /** Só o ícone usa a cor do status; o texto fica na cor normal (contraste). */
  readonly iconClass: string;
}

const STATUS_DISPLAY: Readonly<Record<GoalStatus, StatusDisplay>> = {
  completed: { icon: CircleCheck, iconClass: 'text-status-ok' },
  on_track: { icon: TrendingUp, iconClass: 'text-status-ok' },
  behind: { icon: TriangleAlert, iconClass: 'text-status-warning' },
  no_pace: { icon: Clock, iconClass: 'text-muted-foreground' },
};

function OnTrackText({ goal }: { goal: Goal }) {
  if (goal.estimatedDate === null) return <>{TOO_FAR_LABEL}</>;
  return <>No ritmo — chega em {formatEstimatedMonth(goal.estimatedDate)}</>;
}

/** O texto da situação: "No ritmo — chega em mar/2027", "Atrasada — precisa guardar R$ 500/mês"... */
export function GoalStatusText({ goal }: { goal: Goal }) {
  if (goal.status === 'completed') return <>{COMPLETED_LABEL}</>;
  if (goal.status === 'no_pace') return <>{NO_PACE_LABEL}</>;
  if (goal.status === 'on_track') return <OnTrackText goal={goal} />;
  if (goal.requiredMonthlyCents === null) return <>Atrasada</>;
  return (
    <>
      Atrasada — precisa guardar <Money cents={goal.requiredMonthlyCents} isTrimmed />
      /mês
    </>
  );
}

/** Situação da meta sempre em ícone + texto, nunca só a cor. */
export function GoalStatusLine({ goal }: { goal: Goal }) {
  const display = STATUS_DISPLAY[goal.status];
  const StatusIcon = display.icon;
  return (
    <span className="flex items-start gap-2 text-sm">
      <StatusIcon className={`mt-0.5 size-4 shrink-0 ${display.iconClass}`} aria-hidden="true" />
      <span>
        <GoalStatusText goal={goal} />
      </span>
    </span>
  );
}
