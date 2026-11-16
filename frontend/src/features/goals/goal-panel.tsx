import { FormPanel } from '@/components/form-panel';
import type { Goal } from '@/lib/api/goals';

import { GoalDetail } from './goal-detail';
import { GoalForm } from './goal-form';
import { goalValuesFrom, newGoalValues, toGoalInput, toNewGoalInput } from './goal-form-values';
import { useCreateGoal, useUpdateGoal } from './goals-queries';

export type GoalPanelTarget =
  | { readonly kind: 'create' }
  | { readonly kind: 'detail'; readonly goal: Goal }
  | { readonly kind: 'edit'; readonly goal: Goal };

interface GoalPanelProps {
  /** Nulo com o painel fechado. */
  target: GoalPanelTarget | null;
  onShowDetail: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDeleted: (goal: Goal) => void;
  onNotice: (message: string) => void;
  onClose: () => void;
}

interface PanelTexts {
  readonly title: string;
  readonly description: string;
}

function textsFor(target: GoalPanelTarget | null): PanelTexts {
  if (target?.kind === 'detail') {
    return { title: target.goal.name, description: 'Situação e histórico da meta' };
  }
  if (target?.kind === 'edit') {
    return { title: 'Editar meta', description: target.goal.name };
  }
  return { title: 'Nova meta', description: 'Algo que você quer juntar, com ou sem prazo' };
}

interface CreateViewProps {
  onSaved: (goal: Goal) => void;
}

function CreateView({ onSaved }: CreateViewProps) {
  const createGoal = useCreateGoal();
  return (
    <GoalForm
      initialValues={newGoalValues()}
      asksInitialValue
      goal={null}
      isPending={createGoal.isPending}
      hasError={createGoal.isError}
      submitLabel="Criar meta"
      onSubmit={(values) => createGoal.mutate(toNewGoalInput(values), { onSuccess: onSaved })}
    />
  );
}

interface EditViewProps {
  goal: Goal;
  onSaved: (goal: Goal) => void;
}

function EditView({ goal, onSaved }: EditViewProps) {
  const updateGoal = useUpdateGoal();
  return (
    <GoalForm
      initialValues={goalValuesFrom(goal)}
      asksInitialValue={false}
      goal={goal}
      isPending={updateGoal.isPending}
      hasError={updateGoal.isError}
      submitLabel="Salvar meta"
      onSubmit={(values) =>
        updateGoal.mutate({ id: goal.id, input: toGoalInput(values) }, { onSuccess: onSaved })
      }
    />
  );
}

/** Painel da meta: cria uma nova, mostra o detalhe com o histórico ou edita uma existente. */
export function GoalPanel({
  target,
  onShowDetail,
  onEdit,
  onDeleted,
  onNotice,
  onClose,
}: GoalPanelProps) {
  const { title, description } = textsFor(target);
  return (
    <FormPanel
      open={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={title}
      description={description}
      focusOnOpenSelector='[data-autofocus="true"]'
    >
      {target?.kind === 'create' ? (
        <CreateView
          onSaved={(goal) => {
            onNotice(`Meta ${goal.name} criada`);
            onShowDetail(goal);
          }}
        />
      ) : null}
      {target?.kind === 'edit' ? (
        <EditView
          // Trocar de meta recomeça o formulário do zero.
          key={target.goal.id}
          goal={target.goal}
          onSaved={(goal) => {
            onNotice(`Meta ${goal.name} salva`);
            onShowDetail(goal);
          }}
        />
      ) : null}
      {target?.kind === 'detail' ? (
        <GoalDetail
          key={target.goal.id}
          goal={target.goal}
          onEdit={() => onEdit(target.goal)}
          onDeleted={onDeleted}
          onNotice={onNotice}
        />
      ) : null}
    </FormPanel>
  );
}
