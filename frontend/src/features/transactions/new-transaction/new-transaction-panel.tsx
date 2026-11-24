import { FormPanel } from '@/components/form-panel';
import { useHideValues } from '@/components/hide-values-provider';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import type { Transaction, TransactionInput } from '@/lib/api/transactions';
import { ApiError } from '@/lib/api-client';
import { todayInSaoPaulo } from '@/lib/dates';
import { editAmountField, NEW_AMOUNT_FIELD } from '@/lib/hidden-amount';

import { useCategories } from '../../categories/categories-queries';
import { describeError } from '../../categories/category-labels';
import { useAccountOptions, useSaveTransaction } from '../transactions-queries';
import { TransactionForm } from './transaction-form';
import {
  editTransactionValues,
  fieldErrorsFromApi,
  newTransactionValues,
  type SubmitOutcome,
  type TransactionFormValues,
  type TransactionKind,
} from './transaction-form-values';

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  OPEN_FINANCE_READ_ONLY: 'Esta transação veio do banco e só a categoria pode mudar.',
};

/** Uma abertura do painel: `key` faz cada abertura começar com o formulário limpo. */
export interface NewTransactionSession {
  readonly key: number;
  readonly type: TransactionKind;
  /** Presente quando o painel edita uma transação manual. */
  readonly transaction: Transaction | null;
}

interface NewTransactionPanelProps {
  session: NewTransactionSession | null;
  onClose: () => void;
  onSaved: (input: TransactionInput, wasEdited: boolean) => void;
}

function failureOutcome(error: unknown): SubmitOutcome {
  if (error instanceof ApiError) {
    const fieldErrors = error.code === 'VALIDATION_ERROR' ? fieldErrorsFromApi(error.details) : {};
    const message = Object.keys(fieldErrors).length > 0 ? null : describeSubmitError(error);
    return { isSaved: false, fieldErrors, message };
  }
  return { isSaved: false, fieldErrors: {}, message: describeError(error) };
}

function describeSubmitError(error: ApiError): string {
  return ERROR_MESSAGES[error.code] ?? describeError(error);
}

interface PanelBodyProps {
  session: NewTransactionSession;
  onSaved: NewTransactionPanelProps['onSaved'];
}

function PanelBody({ session, onSaved }: PanelBodyProps) {
  const categoriesQuery = useCategories();
  const accountsQuery = useAccountOptions();
  const save = useSaveTransaction();
  const today = todayInSaoPaulo();
  const { transaction } = session;
  const { areValuesHidden } = useHideValues();

  if (categoriesQuery.isPending || accountsQuery.isPending) return <RowsSkeleton rowCount={4} />;
  if (!categoriesQuery.data || !accountsQuery.data) {
    return (
      <ErrorState
        onRetry={() => {
          void categoriesQuery.refetch();
          void accountsQuery.refetch();
        }}
      />
    );
  }

  const amountField = transaction
    ? editAmountField({ cents: transaction.amountCents, areValuesHidden })
    : NEW_AMOUNT_FIELD;
  const initialValues: TransactionFormValues = transaction
    ? { ...editTransactionValues(transaction, today), amountDigits: amountField.initialDigits }
    : newTransactionValues({ type: session.type, accounts: accountsQuery.data });

  async function submit(input: TransactionInput): Promise<SubmitOutcome> {
    try {
      await save.mutateAsync({ transactionId: transaction?.id ?? null, input });
    } catch (error) {
      return failureOutcome(error);
    }
    onSaved(input, transaction !== null);
    return { isSaved: true };
  }

  return (
    <TransactionForm
      initialValues={initialValues}
      keptAmountDigits={amountField.keptDigits}
      categories={categoriesQuery.data}
      accounts={accountsQuery.data}
      today={today}
      isPending={save.isPending}
      onSubmit={submit}
    />
  );
}

/** Formulário de nova transação ou de edição, em painel: de baixo, lateral ou diálogo, pelo tamanho da tela. */
export function NewTransactionPanel({ session, onClose, onSaved }: NewTransactionPanelProps) {
  const isEditing = session?.transaction != null;
  return (
    <FormPanel
      open={session !== null}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      title={isEditing ? 'Editar transação' : 'Nova transação'}
      description={
        isEditing
          ? 'Corrija o valor, a data, a descrição, a categoria ou a conta.'
          : 'Registre um gasto em dinheiro ou algo que o banco não trouxe.'
      }
      focusOnOpenSelector="[data-autofocus]"
    >
      {session ? <PanelBody key={session.key} session={session} onSaved={onSaved} /> : null}
    </FormPanel>
  );
}
