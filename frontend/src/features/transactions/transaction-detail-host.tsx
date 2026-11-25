import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import type { Notice } from '@/hooks/use-notice';
import type { Category } from '@/lib/api/categories';
import type { DuplicateResolution, Transaction } from '@/lib/api/transactions';

import { useNewTransaction } from './new-transaction/new-transaction-provider';
import { TransactionDetail } from './transaction-detail';
import { useDeleteTransaction, useResolveDuplicate } from './transactions-queries';

const DUPLICATE_RESOLUTION_MESSAGES: Readonly<Record<DuplicateResolution, string>> = {
  merge: 'Transações juntadas. Ficou a do banco, com a sua categoria.',
  keep_both: 'Mantivemos as duas transações.',
};

interface TransactionDetailHostProps {
  transaction: Transaction | undefined;
  categories: readonly Category[];
  showNotice: (notice: Notice) => void;
  onClose: () => void;
  onPickCategory: (transaction: Transaction, category: Category, applyAlways: boolean) => void;
}

/** O detalhe da transação com as ações dele: editar, excluir e conferir a duplicata. */
export function TransactionDetailHost({
  transaction,
  categories,
  showNotice,
  onClose,
  onPickCategory,
}: TransactionDetailHostProps) {
  const deleteTransaction = useDeleteTransaction();
  const resolveDuplicate = useResolveDuplicate();
  const { openNewTransaction } = useNewTransaction();
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  function pickCategory(picked: Transaction, category: Category, applyAlways: boolean) {
    onClose();
    onPickCategory(picked, category, applyAlways);
  }

  function editTransaction(picked: Transaction) {
    onClose();
    openNewTransaction({ transaction: picked });
  }

  function confirmDelete(picked: Transaction) {
    deleteTransaction.mutate(picked, {
      onSuccess: () => {
        setTransactionToDelete(null);
        onClose();
        showNotice({ tone: 'success', message: 'Transação excluída.' });
      },
    });
  }

  function resolve(picked: Transaction, action: DuplicateResolution) {
    resolveDuplicate.mutate(
      { transaction: picked, action },
      {
        onSuccess: () => {
          onClose();
          showNotice({ tone: 'success', message: DUPLICATE_RESOLUTION_MESSAGES[action] });
        },
        onError: () =>
          showNotice({ tone: 'error', message: 'Não foi possível resolver. Tente de novo.' }),
      },
    );
  }

  return (
    <>
      <TransactionDetail
        transaction={transaction}
        categories={categories}
        isResolvingDuplicate={resolveDuplicate.isPending}
        onClose={onClose}
        onPickCategory={pickCategory}
        onEdit={editTransaction}
        onDelete={(picked) => {
          deleteTransaction.reset();
          setTransactionToDelete(picked);
        }}
        onResolveDuplicate={resolve}
      />
      <ConfirmDialog
        open={transactionToDelete !== null}
        onOpenChange={(isOpen) => (isOpen ? undefined : setTransactionToDelete(null))}
        title="Excluir esta transação?"
        description="Ela some da lista e dos totais. Não dá para desfazer."
        confirmLabel="Excluir"
        isPending={deleteTransaction.isPending}
        errorMessage={deleteTransaction.isError ? 'Não foi possível excluir. Tente de novo.' : null}
        onConfirm={() => transactionToDelete && confirmDelete(transactionToDelete)}
      />
    </>
  );
}
