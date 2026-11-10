import { type FormEvent, useEffect, useId, useRef, useState } from 'react';

import { MoneyInput } from '@/components/money-input';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { Category } from '@/lib/api/categories';
import type { AccountOption, TransactionInput } from '@/lib/api/transactions';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import { KIND_OPTION_LABELS } from '../../categories/category-labels';
import { accountOptionLabel } from '../transaction-filters';
import { CategoryChoice } from './category-choice';
import {
  type DateChoice,
  type FieldErrors,
  type FormField,
  type SubmitOutcome,
  type TransactionFormValues,
  type TransactionKind,
  validateTransactionForm,
} from './transaction-form-values';

const MAX_DESCRIPTION_LENGTH = 120;

const TYPE_OPTIONS: readonly { value: TransactionKind; label: string }[] = [
  { value: 'expense', label: KIND_OPTION_LABELS.expense },
  { value: 'income', label: KIND_OPTION_LABELS.income },
];

const DATE_OPTIONS: readonly { value: DateChoice; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'custom', label: 'Escolher data' },
];

const GENERIC_SUBMIT_ERROR = 'Não foi possível salvar. Tente de novo.';

interface TransactionFormProps {
  initialValues: TransactionFormValues;
  /** Todas as categorias; o formulário mostra só as ativas do tipo escolhido. */
  categories: readonly Category[];
  accounts: readonly AccountOption[];
  today: string;
  isPending: boolean;
  onSubmit: (input: TransactionInput) => Promise<SubmitOutcome>;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

function withoutError(errors: FieldErrors, field: FormField): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([name]) => name !== field));
}

// "Dinheiro" primeiro: é a conta do dia a dia deste formulário.
function sortAccounts(accounts: readonly AccountOption[]): AccountOption[] {
  return [...accounts].sort(
    (first, second) => Number(second.type === 'cash') - Number(first.type === 'cash'),
  );
}

export function TransactionForm({
  initialValues,
  categories,
  accounts,
  today,
  isPending,
  onSubmit,
}: TransactionFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const isOffline = useIsOffline();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const idOf = (field: FormField) => `${formId}-${field}`;
  const errorIdOf = (field: FormField) => `${idOf(field)}-error`;

  // Leva o foco ao primeiro campo com erro, para quem usa teclado ou leitor de tela.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  function change(patch: Partial<TransactionFormValues>, field: FormField) {
    setValues((current) => ({ ...current, ...patch }));
    setErrors((current) => withoutError(current, field));
  }

  function changeType(type: TransactionKind) {
    const keepsCategory = categories.some(
      (category) => category.id === values.categoryId && category.kind === type,
    );
    change({ type, categoryId: keepsCategory ? values.categoryId : '' }, 'category');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitMessage(null);
    const validation = validateTransactionForm(values, today);
    if (!validation.isValid) return setErrors(validation.errors);
    const outcome = await onSubmit(validation.input);
    if (outcome.isSaved) return undefined;
    setErrors(outcome.fieldErrors);
    return setSubmitMessage(outcome.message ?? GENERIC_SUBMIT_ERROR);
  }

  const selectableCategories = categories.filter(
    (category) => !category.isArchived && category.kind === values.type,
  );

  return (
    <form ref={formRef} onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="space-y-5">
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
            aria-describedby={errors.amount ? errorIdOf('amount') : undefined}
          />
          <FieldError id={errorIdOf('amount')} message={errors.amount} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('description')}>Descrição</Label>
          <Input
            id={idOf('description')}
            value={values.description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Ex.: Feira, pastel"
            autoComplete="off"
            onChange={(event) => change({ description: event.target.value }, 'description')}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? errorIdOf('description') : undefined}
          />
          <FieldError id={errorIdOf('description')} message={errors.description} />
        </div>
        <div className="space-y-2">
          <CategoryChoice
            categories={selectableCategories}
            value={values.categoryId}
            errorId={errorIdOf('category')}
            hasError={Boolean(errors.category)}
            onChange={(categoryId) => change({ categoryId }, 'category')}
          />
          <FieldError id={errorIdOf('category')} message={errors.category} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={idOf('account')}>Conta</Label>
          <Select
            id={idOf('account')}
            value={values.accountId}
            onChange={(event) => change({ accountId: event.target.value }, 'account')}
            aria-invalid={Boolean(errors.account)}
            aria-describedby={errors.account ? errorIdOf('account') : undefined}
          >
            {sortAccounts(accounts).map((account) => (
              <option key={account.id} value={account.id}>
                {accountOptionLabel(account)}
              </option>
            ))}
          </Select>
          <FieldError id={errorIdOf('account')} message={errors.account} />
        </div>
        <div className="space-y-2">
          <SegmentedControl
            label="Data"
            options={DATE_OPTIONS}
            value={values.dateChoice}
            onChange={(dateChoice) => change({ dateChoice }, 'date')}
          />
          {values.dateChoice === 'custom' ? (
            <Input
              type="date"
              aria-label="Escolha a data"
              value={values.customDate}
              max={today}
              onChange={(event) => change({ customDate: event.target.value }, 'date')}
              aria-invalid={Boolean(errors.date)}
              aria-describedby={errors.date ? errorIdOf('date') : undefined}
            />
          ) : null}
          <FieldError id={errorIdOf('date')} message={errors.date} />
        </div>
      </div>
      {/* O painel rola e o botão fica preso no rodapé (acima da área segura no celular). */}
      <div className="sticky bottom-0 -mx-4 mt-5 space-y-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:-mx-6 lg:-mb-6 lg:bg-popover lg:px-6 lg:pb-6">
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
          Salvar
        </Button>
      </div>
    </form>
  );
}
