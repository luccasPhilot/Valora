import { type FormEvent, useId, useState } from 'react';

import { MoneyInput } from '@/components/money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContributionInput } from '@/lib/api/goals';
import { todayInSaoPaulo } from '@/lib/dates';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import {
  type ContributionFieldErrors,
  type ContributionFormField,
  type ContributionFormValues,
  type ContributionType,
  toContributionInput,
  validateContribution,
} from './contribution-form-values';

const SUBMIT_LABELS: Readonly<Record<ContributionType, string>> = {
  deposit: 'Registrar aporte',
  withdrawal: 'Registrar retirada',
};

interface ContributionFormProps {
  type: ContributionType;
  savedCents: number;
  isPending: boolean;
  hasError: boolean;
  onSubmit: (input: ContributionInput) => void;
  onCancel: () => void;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

/** Valor e data de um aporte ou de uma retirada; a data começa em hoje e nunca passa dele. */
export function ContributionForm({
  type,
  savedCents,
  isPending,
  hasError,
  onSubmit,
  onCancel,
}: ContributionFormProps) {
  const fieldId = useId();
  const today = todayInSaoPaulo();
  const isOffline = useIsOffline();
  const [values, setValues] = useState<ContributionFormValues>({ amountDigits: '', date: today });
  const [errors, setErrors] = useState<ContributionFieldErrors>({});

  function change(changes: Partial<ContributionFormValues>, clearedField: ContributionFormField) {
    setValues((current) => ({ ...current, ...changes }));
    setErrors((current) => ({ ...current, [clearedField]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateContribution(values, { type, savedCents, today });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit(toContributionInput(values, type));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-amount`}>Valor</Label>
        <MoneyInput
          id={`${fieldId}-amount`}
          autoFocus
          digits={values.amountDigits}
          onDigitsChange={(amountDigits) => change({ amountDigits }, 'amount')}
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? `${fieldId}-amount-error` : undefined}
        />
        <FieldError id={`${fieldId}-amount-error`} message={errors.amount} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-date`}>Data</Label>
        <Input
          id={`${fieldId}-date`}
          type="date"
          value={values.date}
          max={today}
          onChange={(event) => change({ date: event.target.value }, 'date')}
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? `${fieldId}-date-error` : undefined}
        />
        <FieldError id={`${fieldId}-date-error`} message={errors.date} />
      </div>
      {hasError ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível registrar. Tente de novo.
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || isOffline}
          title={isOffline ? OFFLINE_ACTION_HINT : undefined}
        >
          {SUBMIT_LABELS[type]}
        </Button>
      </div>
    </form>
  );
}
