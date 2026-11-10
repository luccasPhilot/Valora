import { TriangleAlert } from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';

import { MoneyInput } from '@/components/money-input';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { Category } from '@/lib/api/categories';
import type { PlannedEntryInput } from '@/lib/api/planned-entries';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import { KIND_OPTION_LABELS } from '../categories/category-labels';
import { CategorySelect } from '../categories/category-select';
import {
  type EntryFieldErrors,
  type EntryFormField,
  type EntryFormValues,
  type EntryKind,
  type EntrySubmitOutcome,
  validateEntryForm,
} from './entry-form-values';
import { ENTRY_EDIT_WARNING, parseRecurrence, RECURRENCE_OPTIONS } from './planning-labels';

const MAX_DESCRIPTION_LENGTH = 120;
const GENERIC_SUBMIT_ERROR = 'Não foi possível salvar a previsão. Tente de novo.';

const TYPE_OPTIONS: readonly { value: EntryKind; label: string }[] = [
  { value: 'expense', label: KIND_OPTION_LABELS.expense },
  { value: 'income', label: KIND_OPTION_LABELS.income },
];

interface EntryFormProps {
  initialValues: EntryFormValues;
  /** Todas as categorias; o formulário mostra só as ativas do tipo escolhido. */
  categories: readonly Category[];
  /** Edição de uma previsão que repete: avisa que a mudança vale para todos os meses. */
  showsEditWarning: boolean;
  isPending: boolean;
  submitLabel: string;
  onSubmit: (input: PlannedEntryInput) => Promise<EntrySubmitOutcome>;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function withoutError(errors: EntryFieldErrors, field: EntryFormField): EntryFieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([name]) => name !== field));
}

function EditWarning() {
  return (
    <p className="flex items-start gap-2 rounded-md bg-warning-surface p-3 text-sm text-warning">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{ENTRY_EDIT_WARNING}</span>
    </p>
  );
}

/** Cria ou edita uma previsão: tipo, valor, descrição, categoria, dia, repetição, início e fim. */
export function EntryForm({
  initialValues,
  categories,
  showsEditWarning,
  isPending,
  submitLabel,
  onSubmit,
}: EntryFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const isOffline = useIsOffline();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<EntryFieldErrors>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const idOf = (field: EntryFormField) => `${formId}-${field}`;
  const errorIdOf = (field: EntryFormField) => `${idOf(field)}-error`;
  const describedBy = (field: EntryFormField) => (errors[field] ? errorIdOf(field) : undefined);

  // Leva o foco ao primeiro campo com erro, para quem usa teclado ou leitor de tela.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  function change(patch: Partial<EntryFormValues>, field: EntryFormField) {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => withoutError(current, field));
  }

  function changeType(type: EntryKind) {
    const keepsCategory = categories.some(
      (category) => category.id === values.categoryId && category.kind === type,
    );
    change({ type, categoryId: keepsCategory ? values.categoryId : '' }, 'category');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitMessage(null);
    const validation = validateEntryForm(values);
    if (!validation.isValid) return setErrors(validation.errors);
    const outcome = await onSubmit(validation.input);
    if (outcome.isSaved) return undefined;
    setErrors(outcome.fieldErrors);
    return setSubmitMessage(outcome.message ?? GENERIC_SUBMIT_ERROR);
  }

  const selectableCategories = categories.filter(
    (category) => !category.isArchived && category.kind === values.type,
  );
  const repeats = values.recurrence !== 'none';

  return (
    <form ref={formRef} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="space-y-5">
        {showsEditWarning ? <EditWarning /> : null}
        <SegmentedControl
          label="Tipo"
          options={TYPE_OPTIONS}
          value={values.type}
          onChange={changeType}
        />
        <div className="space-y-2">
          <Label htmlFor={idOf('amount')}>Valor</Label>
          <MoneyInput
            id={idOf('amount')}
            data-autofocus="true"
            digits={values.amountDigits}
            onDigitsChange={(amountDigits) => change({ amountDigits }, 'amount')}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={describedBy('amount')}
          />
          <FieldError id={errorIdOf('amount')} message={errors.amount} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('description')}>Descrição</Label>
          <Input
            id={idOf('description')}
            value={values.description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Ex.: Aluguel, salário"
            autoComplete="off"
            onChange={(event) => change({ description: event.target.value }, 'description')}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy('description')}
          />
          <FieldError id={errorIdOf('description')} message={errors.description} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('category')}>Categoria</Label>
          <CategorySelect
            id={idOf('category')}
            categories={selectableCategories}
            value={values.categoryId}
            emptyLabel="Escolha uma categoria"
            onValueChange={(categoryId) => change({ categoryId }, 'category')}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy('category')}
          />
          <FieldError id={errorIdOf('category')} message={errors.category} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('day')}>Dia do mês</Label>
          <Input
            id={idOf('day')}
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={values.dayOfMonth}
            placeholder="1 a 31"
            onChange={(event) => change({ dayOfMonth: event.target.value }, 'day')}
            aria-invalid={Boolean(errors.day)}
            aria-describedby={describedBy('day')}
          />
          <FieldError id={errorIdOf('day')} message={errors.day} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('recurrence')}>Repetição</Label>
          <Select
            id={idOf('recurrence')}
            value={values.recurrence}
            onChange={(event) => {
              const recurrence = parseRecurrence(event.target.value);
              if (recurrence) setValues((current) => ({ ...current, recurrence }));
            }}
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('start')}>{repeats ? 'Começa em' : 'Mês'}</Label>
          <Input
            id={idOf('start')}
            type="month"
            value={values.startMonth}
            onChange={(event) => change({ startMonth: event.target.value }, 'start')}
            aria-invalid={Boolean(errors.start)}
            aria-describedby={describedBy('start')}
          />
          <FieldError id={errorIdOf('start')} message={errors.start} />
        </div>
        {repeats ? (
          <div className="space-y-2">
            <Label htmlFor={idOf('end')}>Termina em (opcional)</Label>
            <Input
              id={idOf('end')}
              type="month"
              value={values.endMonth}
              onChange={(event) => change({ endMonth: event.target.value }, 'end')}
              aria-invalid={Boolean(errors.end)}
              aria-describedby={describedBy('end')}
            />
            <FieldError id={errorIdOf('end')} message={errors.end} />
          </div>
        ) : null}
        {submitMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {submitMessage}
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
      </div>
    </form>
  );
}
