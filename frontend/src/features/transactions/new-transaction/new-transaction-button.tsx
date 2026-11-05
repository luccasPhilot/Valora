import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useNewTransaction } from './new-transaction-provider';

/** Botão "Nova transação" do topo da tela de Transações. No celular pequeno vira só o ícone redondo. */
export function NewTransactionButton() {
  const { openNewTransaction } = useNewTransaction();
  return (
    <Button
      type="button"
      onClick={() => openNewTransaction()}
      className="rounded-full max-sm:w-11 max-sm:px-0"
    >
      <Plus aria-hidden="true" />
      <span className="max-sm:sr-only">Nova transação</span>
    </Button>
  );
}
