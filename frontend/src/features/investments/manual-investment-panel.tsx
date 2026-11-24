import { Trash2 } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';

import { FormPanel } from '@/components/form-panel';
import { useHideValues } from '@/components/hide-values-provider';
import { MoneyInput } from '@/components/money-input';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  ManualInvestmentChanges,
  ManualInvestmentInput,
  ManualInvestmentType,
} from '@/lib/api/investments';
import { describedBy } from '@/lib/described-by';
import { HIDDEN_AMOUNT_HINT } from '@/lib/hidden-amount';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import {
  EMPTY_FORM_VALUES,
  formValuesOf,
  MANUAL_TYPE_OPTIONS,
  type ManualInvestmentErrors,
  type ManualInvestmentFormValues,
  MAX_TEXT_LENGTH,
  toCreateInput,
  toEditChanges,
  validateCreate,
  validateEdit,
} from './manual-investment-values';

export interface EditableInvestment {
  readonly id: string;
  readonly name: string;
  readonly institutionName: string;
  readonly type: string;
  readonly balanceCents: number;
  /** "Atualizado em 10/11/2026", já pronto para mostrar. */
  readonly updateText: string;
}

export type ManualInvestmentPanelTarget =
  { readonly kind: 'create' } | { readonly kind: 'edit'; readonly investment: EditableInvestment };

interface ManualInvestmentPanelProps {
  /** Nulo com o painel fechado. */
  target: ManualInvestmentPanelTarget | null;
  isSaving: boolean;
  /** Nulo quando não há erro ao salvar. */
  saveErrorMessage: string | null;
  onCreate: (input: ManualInvestmentInput) => void;
  onUpdate: (id: string, changes: ManualInvestmentChanges) => void;
  /** Pede para zerar o valor: a posição passa a contar como encerrada, com o histórico mantido. */
  onClose: (investment: EditableInvestment) => void;
  onRemove: (investment: EditableInvestment) => void;
  onDismiss: () => void;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

interface FormProps {
  target: ManualInvestmentPanelTarget;
  isSaving: boolean;
  onCreate: (input: ManualInvestmentInput) => void;
  onUpdate: (id: string, changes: ManualInvestmentChanges) => void;
}

function ManualInvestmentForm({ target, isSaving, onCreate, onUpdate }: FormProps) {
  const fieldId = useId();
  const isOffline = useIsOffline();
  const { areValuesHidden } = useHideValues();
  const isCreating = target.kind === 'create';
  const initial = isCreating ? EMPTY_FORM_VALUES : formValuesOf(target.investment, areValuesHidden);
  const [values, setValues] = useState<ManualInvestmentFormValues>(initial);
  const [errors, setErrors] = useState<ManualInvestmentErrors>({});

  function change(next: Partial<ManualInvestmentFormValues>, field?: keyof ManualInvestmentErrors) {
    setValues((current) => ({ ...current, ...next }));
    if (field) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = isCreating ? validateCreate(values) : validateEdit(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (target.kind === 'create') {
      onCreate(toCreateInput(values));
      return;
    }
    onUpdate(target.investment.id, toEditChanges(values, initial));
  }

  const valueLabel = isCreating ? 'Valor atual' : 'Atualizar valor';
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-balance`}>{valueLabel}</Label>
        <MoneyInput
          id={`${fieldId}-balance`}
          data-autofocus="true"
          digits={values.digits}
          onDigitsChange={(digits) => change({ digits }, 'balance')}
          aria-invalid={Boolean(errors.balance)}
          aria-describedby={describedBy([
            `${fieldId}-balance-hint`,
            Boolean(errors.balance) && `${fieldId}-balance-error`,
          ])}
        />
        <p id={`${fieldId}-balance-hint`} className="text-sm text-muted-foreground">
          {isCreating
            ? 'Quanto vale hoje, em reais. O Valora guarda uma foto por dia.'
            : areValuesHidden
              ? HIDDEN_AMOUNT_HINT
              : `${target.investment.updateText}. Deixe como está para manter o valor.`}
        </p>
        <FieldError id={`${fieldId}-balance-error`} message={errors.balance} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-name`}>Nome</Label>
        <Input
          id={`${fieldId}-name`}
          value={values.name}
          maxLength={MAX_TEXT_LENGTH}
          autoComplete="off"
          placeholder="Fundo INCO"
          onChange={(event) => change({ name: event.target.value }, 'name')}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy([Boolean(errors.name) && `${fieldId}-name-error`])}
        />
        <FieldError id={`${fieldId}-name-error`} message={errors.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-institution`}>Instituição</Label>
        <Input
          id={`${fieldId}-institution`}
          value={values.institutionName}
          maxLength={MAX_TEXT_LENGTH}
          autoComplete="off"
          placeholder="INCO, Binance, corretora..."
          onChange={(event) => change({ institutionName: event.target.value }, 'institutionName')}
          aria-invalid={Boolean(errors.institutionName)}
          aria-describedby={describedBy([
            Boolean(errors.institutionName) && `${fieldId}-institution-error`,
          ])}
        />
        <FieldError id={`${fieldId}-institution-error`} message={errors.institutionName} />
      </div>
      <SegmentedControl<ManualInvestmentType>
        label="Tipo"
        options={MANUAL_TYPE_OPTIONS}
        value={values.type}
        onChange={(type) => change({ type })}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={isSaving || isOffline}
        title={isOffline ? OFFLINE_ACTION_HINT : undefined}
      >
        {isCreating ? 'Adicionar investimento' : 'Salvar'}
      </Button>
    </form>
  );
}

interface EditActionsProps {
  investment: EditableInvestment;
  isSaving: boolean;
  onClose: (investment: EditableInvestment) => void;
  onRemove: (investment: EditableInvestment) => void;
}

function EditActions({ investment, isSaving, onClose, onRemove }: EditActionsProps) {
  const isOffline = useIsOffline();
  const offlineHint = isOffline ? OFFLINE_ACTION_HINT : undefined;
  return (
    <div className="space-y-3 border-t pt-5">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isSaving || isOffline}
        title={offlineHint}
        onClick={() => onClose(investment)}
      >
        Encerrar posição
      </Button>
      <p className="text-sm text-muted-foreground">
        Encerrar zera o valor e guarda o histórico. A posição sai da lista.
      </p>
      <Button
        type="button"
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        disabled={isSaving || isOffline}
        title={offlineHint}
        onClick={() => onRemove(investment)}
      >
        <Trash2 aria-hidden="true" />
        Excluir
      </Button>
    </div>
  );
}

/** Painel da posição manual: cadastra uma nova ou atualiza, encerra e exclui uma existente. */
export function ManualInvestmentPanel({
  target,
  isSaving,
  saveErrorMessage,
  onCreate,
  onUpdate,
  onClose,
  onRemove,
  onDismiss,
}: ManualInvestmentPanelProps) {
  const isCreating = target?.kind === 'create';
  return (
    <FormPanel
      open={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onDismiss();
      }}
      title={target?.kind === 'edit' ? target.investment.name : 'Novo investimento'}
      description={
        target?.kind === 'edit'
          ? target.investment.institutionName
          : 'Para o que não chega pelo Open Finance: INCO, Binance, outras corretoras'
      }
      focusOnOpenSelector='[data-autofocus="true"]'
    >
      {target ? (
        <div className="space-y-5">
          <ManualInvestmentForm
            // Trocar de posição (ou reabrir) recomeça o formulário do zero.
            key={target.kind === 'edit' ? target.investment.id : 'create'}
            target={target}
            isSaving={isSaving}
            onCreate={onCreate}
            onUpdate={onUpdate}
          />
          {saveErrorMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {saveErrorMessage}
            </p>
          ) : null}
          {!isCreating && target.kind === 'edit' ? (
            <EditActions
              investment={target.investment}
              isSaving={isSaving}
              onClose={onClose}
              onRemove={onRemove}
            />
          ) : null}
        </div>
      ) : null}
    </FormPanel>
  );
}
