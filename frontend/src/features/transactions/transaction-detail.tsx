import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { FormPanel } from '@/components/form-panel';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/api/categories';
import type { DuplicateResolution, Transaction } from '@/lib/api/transactions';
import { formatDate } from '@/lib/format';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { CategoryPicker } from './category-picker';
import { DuplicateComparison } from './duplicate-comparison';
import { amountColorClass } from './transaction-item';

const STATUS_LABELS: Readonly<Record<Transaction['status'], string>> = {
  pending: 'Pendente',
  posted: 'Confirmada',
};

const SOURCE_LABELS: Readonly<Record<Transaction['source'], string>> = {
  open_finance: 'Open Finance',
  manual: 'Lançamento manual',
};

const CATEGORY_SOURCE_LABELS: Readonly<Record<Transaction['categorySource'], string>> = {
  user: 'Escolhida por você',
  rule: 'Por uma regra',
  pluggy: 'Sugerida pelo banco',
  none: 'Sem categoria',
};

interface DetailActions {
  onPickCategory: (transaction: Transaction, category: Category, applyAlways: boolean) => void;
  /** Editar e excluir só aparecem em transação manual. */
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onResolveDuplicate: (transaction: Transaction, action: DuplicateResolution) => void;
}

interface TransactionDetailProps extends DetailActions {
  transaction: Transaction | undefined;
  categories: readonly Category[];
  isResolvingDuplicate: boolean;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

function installmentText(transaction: Transaction): string | null {
  if (transaction.installmentNumber === null || transaction.installmentTotal === null) return null;
  return `${transaction.installmentNumber} de ${transaction.installmentTotal}`;
}

function ManualActions({
  transaction,
  onEdit,
  onDelete,
}: { transaction: Transaction } & Pick<DetailActions, 'onEdit' | 'onDelete'>) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="outline" onClick={() => onEdit(transaction)}>
        <Pencil aria-hidden="true" />
        Editar
      </Button>
      <Button variant="outline" onClick={() => onDelete(transaction)}>
        <Trash2 aria-hidden="true" />
        Excluir
      </Button>
    </div>
  );
}

interface DetailBodyProps extends DetailActions {
  transaction: Transaction;
  categories: readonly Category[];
  isResolvingDuplicate: boolean;
}

function DetailBody({
  transaction,
  categories,
  isResolvingDuplicate,
  onPickCategory,
  onEdit,
  onDelete,
  onResolveDuplicate,
}: DetailBodyProps) {
  const installment = installmentText(transaction);
  return (
    <div className="space-y-5">
      <p
        className={`text-3xl font-bold tabular-nums font-display ${amountColorClass(transaction)}`}
      >
        <Money cents={transaction.amountCents} isSigned />
      </p>
      {transaction.possibleDuplicateOfId ? (
        <DuplicateComparison
          bankTransaction={transaction}
          isResolving={isResolvingDuplicate}
          onResolve={(action) => onResolveDuplicate(transaction, action)}
        />
      ) : null}
      <dl className="divide-y divide-border">
        <DetailRow label="Descrição">{transaction.description}</DetailRow>
        <DetailRow label="Data">{formatDate(transaction.date)}</DetailRow>
        <DetailRow label="Situação">{STATUS_LABELS[transaction.status]}</DetailRow>
        <DetailRow label="Origem">{SOURCE_LABELS[transaction.source]}</DetailRow>
        <DetailRow label="Conta">{transaction.account.name}</DetailRow>
        {installment ? <DetailRow label="Parcela">{installment}</DetailRow> : null}
        <DetailRow label="Categoria">
          <span className="inline-flex items-center gap-2">
            {transaction.category ? <CategoryBadgeIcon name={transaction.category.icon} /> : null}
            {transaction.category?.name ?? 'Sem categoria'}
          </span>
        </DetailRow>
        <DetailRow label="Como foi escolhida">
          {CATEGORY_SOURCE_LABELS[transaction.categorySource]}
        </DetailRow>
      </dl>
      {transaction.source === 'manual' ? (
        <ManualActions transaction={transaction} onEdit={onEdit} onDelete={onDelete} />
      ) : null}
      <section aria-labelledby="change-category-title" className="space-y-3">
        <h3 id="change-category-title" className="font-display text-lg font-semibold">
          Trocar categoria
        </h3>
        <CategoryPicker
          categories={categories}
          currentCategoryId={transaction.category?.id ?? null}
          applyAlwaysLabel={`Aplicar sempre para “${transaction.description}”`}
          onPick={(category, applyAlways) => onPickCategory(transaction, category, applyAlways)}
        />
      </section>
    </div>
  );
}

/** Detalhe em painel: de baixo no celular, lateral no tablet, diálogo no computador. */
export function TransactionDetail({ transaction, onClose, ...bodyProps }: TransactionDetailProps) {
  return (
    <FormPanel
      open={transaction !== undefined}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      title="Detalhes da transação"
      description="Veja os dados completos e troque a categoria."
    >
      {transaction ? (
        <DetailBody key={transaction.id} transaction={transaction} {...bodyProps} />
      ) : null}
    </FormPanel>
  );
}
