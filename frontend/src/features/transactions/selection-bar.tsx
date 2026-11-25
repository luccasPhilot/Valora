import { CheckCheck, Tags, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MAX_BULK_TRANSACTIONS } from '@/lib/api/transactions';

interface SelectionBarProps {
  selectedCount: number;
  isFull: boolean;
  isPending: boolean;
  onChangeCategory: () => void;
  onMarkReviewed: () => void;
  onCancel: () => void;
}

function describeCount(count: number): string {
  if (count === 0) return 'Nenhuma selecionada';
  return count === 1 ? '1 selecionada' : `${count} selecionadas`;
}

/**
 * Barra do modo "Selecionar". Fica presa ao pé da tela, acima da área segura, enquanto a lista
 * rola, e assenta depois da última linha no fim: nunca a cobre.
 */
export function SelectionBar({
  selectedCount,
  isFull,
  isPending,
  onChangeCategory,
  onMarkReviewed,
  onCancel,
}: SelectionBarProps) {
  const isDisabled = selectedCount === 0 || isPending;
  return (
    <div className="sticky bottom-0 z-40 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <section
        aria-label="Ações da seleção"
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-overlay"
      >
        <p aria-live="polite" className="min-w-0 flex-1 px-2 text-sm font-semibold tabular-nums">
          {describeCount(selectedCount)}
          {isFull ? (
            <span className="block text-xs font-normal text-muted-foreground">
              Até {MAX_BULK_TRANSACTIONS} de uma vez
            </span>
          ) : null}
        </p>
        <Button variant="ghost" onClick={onCancel}>
          <X aria-hidden="true" />
          Cancelar
        </Button>
        {/* Abaixo de 400 px os dois botões não cabem lado a lado: um embaixo do outro. */}
        <div className="flex w-full flex-col gap-2 min-[25rem]:flex-row sm:w-auto">
          <Button
            variant="outline"
            disabled={isDisabled}
            onClick={onMarkReviewed}
            className="flex-1 sm:flex-none"
          >
            <CheckCheck aria-hidden="true" />
            Marcar como revisadas
          </Button>
          <Button disabled={isDisabled} onClick={onChangeCategory} className="flex-1 sm:flex-none">
            <Tags aria-hidden="true" />
            Trocar categoria
          </Button>
        </div>
      </section>
    </div>
  );
}
