import { List, Trash2 } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { Link } from 'react-router';

import { FormPanel } from '@/components/form-panel';
import { MoneyInput } from '@/components/money-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Budget } from '@/lib/api/budgets';
import type { Category } from '@/lib/api/categories';
import { formatMonth } from '@/lib/format';
import { centsToDigits, digitsToCents } from '@/lib/money-digits';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

import { CategorySelect } from '../categories/category-select';
import { transactionsLinkFor } from './budget-months';
import { BudgetStatusText } from './budget-row';

export type BudgetPanelTarget =
  { readonly kind: 'create' } | { readonly kind: 'edit'; readonly budget: Budget };

export interface LimitInput {
  readonly categoryId: string;
  readonly limitCents: number;
}

interface BudgetPanelProps {
  /** Nulo com o painel fechado. */
  target: BudgetPanelTarget | null;
  /** `AAAA-MM`. */
  month: string;
  /** Categorias de despesa ativas ainda sem limite no mês: as opções do orçamento novo. */
  availableCategories: readonly Category[];
  isSaving: boolean;
  isRemoving: boolean;
  hasError: boolean;
  onSave: (input: LimitInput) => void;
  onRemove: (budget: Budget) => void;
  onClose: () => void;
}

type FieldErrors = Partial<Record<'category' | 'limit', string>>;

const CATEGORY_REQUIRED_MESSAGE = 'Escolha uma categoria';
const LIMIT_REQUIRED_MESSAGE = 'Informe um limite maior que zero';

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

interface LimitFormProps {
  target: BudgetPanelTarget;
  availableCategories: readonly Category[];
  isSaving: boolean;
  onSave: (input: LimitInput) => void;
}

function LimitForm({ target, availableCategories, isSaving, onSave }: LimitFormProps) {
  const fieldId = useId();
  const isCreating = target.kind === 'create';
  const isOffline = useIsOffline();
  const [categoryId, setCategoryId] = useState(isCreating ? '' : target.budget.categoryId);
  const [digits, setDigits] = useState(isCreating ? '' : centsToDigits(target.budget.limitCents));
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FieldErrors = {};
    if (categoryId === '') nextErrors.category = CATEGORY_REQUIRED_MESSAGE;
    if (digitsToCents(digits) <= 0) nextErrors.limit = LIMIT_REQUIRED_MESSAGE;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave({ categoryId, limitCents: digitsToCents(digits) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {isCreating ? (
        <div className="space-y-2">
          <Label htmlFor={`${fieldId}-category`}>Categoria</Label>
          <CategorySelect
            id={`${fieldId}-category`}
            data-autofocus="true"
            categories={availableCategories}
            value={categoryId}
            emptyLabel="Escolha uma categoria"
            onValueChange={(nextId) => {
              setCategoryId(nextId);
              setErrors((current) => ({ ...current, category: undefined }));
            }}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? `${fieldId}-category-error` : undefined}
          />
          <FieldError id={`${fieldId}-category-error`} message={errors.category} />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${fieldId}-limit`}>Limite do mês</Label>
        <MoneyInput
          id={`${fieldId}-limit`}
          data-autofocus={isCreating ? undefined : 'true'}
          digits={digits}
          onDigitsChange={(nextDigits) => {
            setDigits(nextDigits);
            setErrors((current) => ({ ...current, limit: undefined }));
          }}
          aria-invalid={Boolean(errors.limit)}
          aria-describedby={errors.limit ? `${fieldId}-limit-error` : undefined}
        />
        <FieldError id={`${fieldId}-limit-error`} message={errors.limit} />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={isSaving || isOffline}
        title={isOffline ? OFFLINE_ACTION_HINT : undefined}
      >
        {isCreating ? 'Criar orçamento' : 'Salvar limite'}
      </Button>
    </form>
  );
}

interface EditActionsProps {
  budget: Budget;
  month: string;
  isRemoving: boolean;
  onRemove: (budget: Budget) => void;
}

function EditActions({ budget, month, isRemoving, onRemove }: EditActionsProps) {
  return (
    <div className="space-y-3 border-t pt-5">
      <p className="text-sm text-muted-foreground">
        Neste mês: <BudgetStatusText budget={budget} />
      </p>
      <Button asChild variant="outline" className="w-full">
        <Link to={transactionsLinkFor(budget.categoryId, month)}>
          <List aria-hidden="true" />
          Ver transações
        </Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        disabled={isRemoving}
        onClick={() => onRemove(budget)}
      >
        <Trash2 aria-hidden="true" />
        Remover limite
      </Button>
    </div>
  );
}

/** Painel do orçamento: cria um limite novo ou edita, remove e abre as transações de um existente. */
export function BudgetPanel({
  target,
  month,
  availableCategories,
  isSaving,
  isRemoving,
  hasError,
  onSave,
  onRemove,
  onClose,
}: BudgetPanelProps) {
  const isCreating = target?.kind === 'create';
  return (
    <FormPanel
      open={target !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={target?.kind === 'edit' ? target.budget.categoryName : 'Novo orçamento'}
      description={isCreating ? 'Defina o limite de uma categoria' : formatMonth(`${month}-01`)}
      focusOnOpenSelector='[data-autofocus="true"]'
    >
      {target ? (
        <div className="space-y-5">
          <LimitForm
            // Trocar de categoria (ou reabrir) recomeça o formulário do zero.
            key={target.kind === 'edit' ? target.budget.categoryId : 'create'}
            target={target}
            availableCategories={availableCategories}
            isSaving={isSaving}
            onSave={onSave}
          />
          {hasError ? (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível salvar o orçamento. Tente de novo.
            </p>
          ) : null}
          {target.kind === 'edit' ? (
            <EditActions
              budget={target.budget}
              month={month}
              isRemoving={isRemoving}
              onRemove={onRemove}
            />
          ) : null}
        </div>
      ) : null}
    </FormPanel>
  );
}
