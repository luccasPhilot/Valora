import { Flag, Plus } from 'lucide-react';
import { useState } from 'react';

import { NoticeRegion } from '@/components/notice-region';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotice } from '@/hooks/use-notice';
import type { Goal } from '@/lib/api/goals';

import { GoalCard } from './goal-card';
import { GoalPanel, type GoalPanelTarget } from './goal-panel';
import { useGoals } from './goals-queries';

const SKELETON_CARDS = 4;

/** O painel guarda só o id da meta: o detalhe sempre mostra a versão mais recente da lista. */
type PanelState =
  { readonly kind: 'create' } | { readonly kind: 'detail' | 'edit'; readonly goalId: string };

function resolveTarget(panel: PanelState | null, goals: readonly Goal[]): GoalPanelTarget | null {
  if (panel === null) return null;
  if (panel.kind === 'create') return panel;
  const goal = goals.find((candidate) => candidate.id === panel.goalId);
  return goal ? { kind: panel.kind, goal } : null;
}

function GoalsSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: SKELETON_CARDS }, (_, index) => (
        <Skeleton key={index} className="h-36 w-full rounded-lg" />
      ))}
    </div>
  );
}

function CreateGoalButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" onClick={onClick}>
      <Plus aria-hidden="true" />
      Criar meta
    </Button>
  );
}

export function Component() {
  const goalsQuery = useGoals();
  const { notice, showNotice } = useNotice();
  const [panel, setPanel] = useState<PanelState | null>(null);
  const goals = goalsQuery.data ?? [];

  function closePanelWithNotice(goal: Goal) {
    setPanel(null);
    showNotice({ tone: 'success', message: `Meta ${goal.name} excluída` });
  }

  return (
    <div className="space-y-4">
      {goals.length > 0 ? (
        <div className="flex justify-end">
          <CreateGoalButton onClick={() => setPanel({ kind: 'create' })} />
        </div>
      ) : null}
      {goalsQuery.isPending ? <GoalsSkeleton /> : null}
      {goalsQuery.isError ? <ErrorState onRetry={() => void goalsQuery.refetch()} /> : null}
      {goalsQuery.isSuccess && goals.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Nenhuma meta ainda"
          description="Crie uma meta para a reserva de emergência, a viagem ou a entrada do apartamento. Eu mostro o progresso e quando você chega lá, no ritmo em que está guardando."
          action={<CreateGoalButton onClick={() => setPanel({ kind: 'create' })} />}
        />
      ) : null}
      {goals.length > 0 ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onSelect={(selected) => setPanel({ kind: 'detail', goalId: selected.id })}
            />
          ))}
        </ul>
      ) : null}
      <GoalPanel
        target={resolveTarget(panel, goals)}
        onShowDetail={(goal) => setPanel({ kind: 'detail', goalId: goal.id })}
        onEdit={(goal) => setPanel({ kind: 'edit', goalId: goal.id })}
        onDeleted={closePanelWithNotice}
        onNotice={(message) => showNotice({ tone: 'success', message })}
        onClose={() => setPanel(null)}
      />
      <NoticeRegion notice={notice} />
    </div>
  );
}
