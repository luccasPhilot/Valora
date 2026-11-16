import { TriangleAlert } from 'lucide-react';
import { type FormEvent, type ReactNode, useId, useState } from 'react';

import { Money } from '@/components/money';
import { MoneyInput } from '@/components/money-input';
import { SegmentedControl, type SegmentedOption } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Goal } from '@/lib/api/goals';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import { IconPicker } from '../categories/icon-picker';
import {
  type GoalFieldErrors,
  type GoalFormField,
  type GoalFormValues,
  type GoalMode,
  MAX_GOAL_NAME_LENGTH,
  validateGoalValues,
} from './goal-form-values';
import { LinkPicker } from './link-picker';

const MODE_OPTIONS: readonly SegmentedOption<GoalMode>[] = [
  { value: 'manual', label: 'Eu informo' },
  { value: 'linked', label: 'Vinculada' },
];

interface GoalFormProps {
  initialValues: GoalFormValues;
  /** Só a meta nova pergunta quanto você já tinha guardado. */
  asksInitialValue: boolean;
  /** A meta que está sendo editada; nula na meta nova. */
  goal: Goal | null;
  isPending: boolean;
  hasError: boolean;
  submitLabel: string;
  onSubmit: (values: GoalFormValues) => void;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

function ModeNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 text-sm">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Avisos ao trocar entre "Eu informo" e "Vinculada" numa meta que já tem aportes ou vínculos. */
function ModeChangeNotice({ goal, mode }: { goal: Goal | null; mode: GoalMode }) {
  if (goal === null || goal.manualSavedCents === 0) return null;
  if (mode === 'linked' && !goal.isLinked) {
    return (
      <ModeNotice>
        Os aportes (<Money cents={goal.manualSavedCents} />) deixam de contar enquanto a meta
        estiver vinculada. Eles continuam guardados no histórico.
      </ModeNotice>
    );
  }
  if (mode === 'manual' && goal.isLinked) {
    return (
      <ModeNotice>
        Ao desvincular, o valor da meta volta a ser o dos aportes (
        <Money cents={goal.manualSavedCents} />
        ).
      </ModeNotice>
    );
  }
  return null;
}

/** Nome, ícone, valor desejado, prazo opcional, de onde vem o valor guardado e (na meta nova) o que você já tem. */
export function GoalForm({
  initialValues,
  asksInitialValue,
  goal,
  isPending,
  hasError,
  submitLabel,
  onSubmit,
}: GoalFormProps) {
  const fieldId = useId();
  const isOffline = useIsOffline();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<GoalFieldErrors>({});

  function change(changes: Partial<GoalFormValues>, clearedField?: GoalFormField) {
    setValues((current) => ({ ...current, ...changes }));
    if (clearedField) setErrors((current) => ({ ...current, [clearedField]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateGoalValues(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>Nome</Label>
        <Input
          id={`${fieldId}-name`}
          data-autofocus="true"
          value={values.name}
          maxLength={MAX_GOAL_NAME_LENGTH}
          autoComplete="off"
          onChange={(event) => change({ name: event.target.value }, 'name')}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${fieldId}-name-error` : undefined}
        />
        <FieldError id={`${fieldId}-name-error`} message={errors.name} />
      </div>
      <IconPicker value={values.icon} onChange={(icon) => change({ icon })} />
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-target`}>Valor desejado</Label>
        <MoneyInput
          id={`${fieldId}-target`}
          digits={values.targetDigits}
          onDigitsChange={(targetDigits) => change({ targetDigits }, 'target')}
          aria-invalid={Boolean(errors.target)}
          aria-describedby={errors.target ? `${fieldId}-target-error` : undefined}
        />
        <FieldError id={`${fieldId}-target-error`} message={errors.target} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-date`}>Prazo (opcional)</Label>
        <Input
          id={`${fieldId}-date`}
          type="date"
          value={values.targetDate}
          onChange={(event) => change({ targetDate: event.target.value })}
        />
      </div>
      <SegmentedControl
        label="Valor guardado"
        options={MODE_OPTIONS}
        value={values.mode}
        onChange={(mode) => change({ mode }, 'links')}
      />
      <ModeChangeNotice goal={goal} mode={values.mode} />
      {values.mode === 'linked' ? (
        <LinkPicker
          selected={values.links}
          onChange={(links) => change({ links }, 'links')}
          currentGoalId={goal?.id ?? null}
          currentLinks={goal?.links ?? []}
          errorId={`${fieldId}-links-error`}
          errorMessage={errors.links}
        />
      ) : null}
      {asksInitialValue && values.mode === 'manual' ? (
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-initial`}>Já guardado (opcional)</Label>
          <MoneyInput
            id={`${fieldId}-initial`}
            digits={values.initialDigits}
            onDigitsChange={(initialDigits) => change({ initialDigits })}
          />
          <p className="text-sm text-muted-foreground">
            O que você já tinha antes de usar o app. Não entra no ritmo de aportes.
          </p>
        </div>
      ) : null}
      {hasError ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível salvar a meta. Tente de novo.
        </p>
      ) : null}
      <Button
        type="submit"
        className="w-full"
        disabled={isPending || isOffline}
        title={isOffline ? OFFLINE_ACTION_HINT : undefined}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
