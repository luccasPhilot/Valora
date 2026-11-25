import { Check, Copy, Tags } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Transaction } from '@/lib/api/transactions';

import { CategoryBadgeIcon } from '../categories/category-icons';
import { ManualBadge, PossibleDuplicateBadge, UncategorizedBadge } from './transaction-badges';
import { AmountText, iconName, InstallmentBadge } from './transaction-item';

interface ReviewItemProps {
  transaction: Transaction;
  /** Enquanto o "Ok" desta linha está sendo gravado. */
  isReviewing: boolean;
  onOpen: (transaction: Transaction) => void;
  onReview: (transaction: Transaction) => void;
  onChangeCategory: (transaction: Transaction) => void;
}

/**
 * Linha da caixa "Para revisar": tocar abre o detalhe; as ações ficam ao lado no computador e
 * embaixo, alinhadas com o texto, no celular. "Conferir" abre o detalhe, que traz a comparação.
 */
export function ReviewItem({
  transaction,
  isReviewing,
  onOpen,
  onReview,
  onChangeCategory,
}: ReviewItemProps) {
  const { description } = transaction;
  const isDuplicate = transaction.possibleDuplicateOfId !== null;
  return (
    <div className="flex flex-col gap-1 py-2 md:flex-row md:items-center md:gap-3">
      <button
        type="button"
        onClick={() => onOpen(transaction)}
        className="flex min-h-[4.25rem] min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategoryBadgeIcon name={iconName(transaction)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="line-clamp-2 text-base font-medium break-words">{description}</span>
            <InstallmentBadge transaction={transaction} />
          </span>
          {/* Abaixo de 360 px a conta sai, como na lista; sem categoria, a etiqueta diz isso. */}
          <span className="line-clamp-2 block text-sm text-muted-foreground">
            {transaction.category?.name}
            <span className="max-[359px]:hidden">
              {transaction.category ? ' · ' : null}
              {transaction.account.name}
            </span>
          </span>
          {transaction.category === null || isDuplicate || transaction.source === 'manual' ? (
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {transaction.category === null ? <UncategorizedBadge /> : null}
              {transaction.source === 'manual' ? <ManualBadge /> : null}
              {isDuplicate ? <PossibleDuplicateBadge /> : null}
            </span>
          ) : null}
        </span>
        <AmountText transaction={transaction} />
      </button>
      {/* 3.75 rem = margem (0.5) + ícone (2.5) + espaço (0.75): as ações começam onde a descrição
          começa. Abaixo de 400 px o recuo não deixa as duas ações numa linha: elas vão para a direita. */}
      <div className="flex flex-wrap items-center justify-end gap-2 min-[25rem]:justify-start min-[25rem]:pl-[3.75rem] md:shrink-0 md:pl-0">
        {isDuplicate ? (
          <Button
            variant="ghost"
            aria-label={`Conferir possível duplicata ${description}`}
            onClick={() => onOpen(transaction)}
          >
            <Copy aria-hidden="true" />
            Conferir
          </Button>
        ) : null}
        <Button
          variant="ghost"
          aria-label={`Trocar categoria de ${description}`}
          disabled={isReviewing}
          onClick={() => onChangeCategory(transaction)}
        >
          <Tags aria-hidden="true" />
          Trocar categoria
        </Button>
        <Button
          variant="outline"
          aria-label={`Ok, marcar ${description} como revisada`}
          disabled={isReviewing}
          onClick={() => onReview(transaction)}
        >
          <Check aria-hidden="true" />
          Ok
        </Button>
      </div>
    </div>
  );
}
