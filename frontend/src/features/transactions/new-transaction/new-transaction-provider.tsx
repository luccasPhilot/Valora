import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { NoticeRegion } from '@/components/notice-region';
import { useNotice } from '@/hooks/use-notice';
import type { Transaction, TransactionInput } from '@/lib/api/transactions';

import { NewTransactionPanel, type NewTransactionSession } from './new-transaction-panel';
import type { TransactionKind } from './transaction-form-values';

const SAVED_MESSAGES: Readonly<Record<TransactionKind, string>> = {
  expense: 'Despesa registrada',
  income: 'Receita registrada',
};
const EDITED_MESSAGE = 'Transação atualizada';

export interface OpenNewTransactionOptions {
  /** Tipo já escolhido (os atalhos "Registrar despesa" e "Adicionar receita"). Padrão: despesa. */
  readonly type?: TransactionKind;
  /** Com uma transação manual, o painel vira a edição dela. */
  readonly transaction?: Transaction;
}

interface NewTransactionContextValue {
  readonly openNewTransaction: (options?: OpenNewTransactionOptions) => void;
}

const NewTransactionContext = createContext<NewTransactionContextValue | null>(null);

/** Abre o formulário de nova transação de qualquer tela: botão do topo, edição e atalhos do Início. */
export function useNewTransaction(): NewTransactionContextValue {
  const value = useContext(NewTransactionContext);
  if (!value) throw new Error('useNewTransaction precisa estar dentro de NewTransactionProvider');
  return value;
}

interface NewTransactionProviderProps {
  children: ReactNode;
}

export function NewTransactionProvider({ children }: NewTransactionProviderProps) {
  const [session, setSession] = useState<NewTransactionSession | null>(null);
  const { notice, showNotice } = useNotice();

  const openNewTransaction = useCallback((options: OpenNewTransactionOptions = {}) => {
    setSession((previous) => ({
      key: (previous?.key ?? 0) + 1,
      type: options.type ?? 'expense',
      transaction: options.transaction ?? null,
    }));
  }, []);

  function handleSaved(input: TransactionInput, wasEdited: boolean) {
    setSession(null);
    showNotice({
      tone: 'success',
      message: wasEdited ? EDITED_MESSAGE : SAVED_MESSAGES[input.type],
    });
  }

  const value = useMemo(() => ({ openNewTransaction }), [openNewTransaction]);

  return (
    <NewTransactionContext.Provider value={value}>
      {children}
      <NewTransactionPanel
        session={session}
        onClose={() => setSession(null)}
        onSaved={handleSaved}
      />
      <NoticeRegion notice={notice} />
    </NewTransactionContext.Provider>
  );
}
