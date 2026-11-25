import type { Notice } from '@/hooks/use-notice';
import type { Category } from '@/lib/api/categories';
import type { Transaction } from '@/lib/api/transactions';

import type { RuleSuggestionOffer } from '../categories/use-rule-suggestion-offer';
import { useChangeCategory } from './transactions-queries';

interface PickCategoryOptions {
  readonly showNotice: (notice: Notice) => void;
  readonly suggestionOffer: RuleSuggestionOffer;
}

/**
 * Troca a categoria de uma transação. Se a troca já pede uma regra (2 correções iguais), pergunta
 * "Criar regra?" no lugar do aviso de sucesso: os dois no pé da tela se cobririam.
 */
export function usePickCategory({ showNotice, suggestionOffer }: PickCategoryOptions) {
  const changeCategory = useChangeCategory();
  return (transaction: Transaction, category: Category, applyAlways: boolean) => {
    changeCategory.mutate(
      { transaction, category, applyAlways },
      {
        onSuccess: ({ ruleSuggestion }) => {
          if (ruleSuggestion) {
            suggestionOffer.offer(ruleSuggestion);
            return;
          }
          showNotice({
            tone: 'success',
            message: applyAlways
              ? `Categoria trocada para ${category.name}. Regra criada para esta descrição.`
              : `Categoria trocada para ${category.name}.`,
          });
        },
        onError: () =>
          showNotice({
            tone: 'error',
            message: 'Não foi possível trocar a categoria. A anterior foi mantida.',
          }),
      },
    );
  };
}
