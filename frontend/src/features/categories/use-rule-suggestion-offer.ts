import { useState } from 'react';

import type { Notice } from '@/hooks/use-notice';
import type { RuleSuggestion } from '@/lib/api/categories';

import { useAcceptRuleSuggestion, useDismissRuleSuggestion } from './categories-queries';

/**
 * A pergunta "Criar regra?" depois de uma troca de categoria. "Criar regra" cria a regra `equals`;
 * "Agora não" dispensa o par, que não volta a ser sugerido.
 */
export function useRuleSuggestionOffer(showNotice: (notice: Notice) => void) {
  const [offered, setOffered] = useState<RuleSuggestion | null>(null);
  const acceptSuggestion = useAcceptRuleSuggestion();
  const dismissSuggestion = useDismissRuleSuggestion();

  function accept() {
    if (!offered) return;
    acceptSuggestion.mutate(offered, {
      onSuccess: () => {
        setOffered(null);
        showNotice({
          tone: 'success',
          message: `Regra criada. As transações “${offered.pattern}” foram para ${offered.categoryName}.`,
        });
      },
      onError: () =>
        showNotice({ tone: 'error', message: 'Não foi possível criar a regra. Tente de novo.' }),
    });
  }

  function decline() {
    if (!offered) return;
    setOffered(null);
    dismissSuggestion.mutate(offered, {
      onError: () =>
        showNotice({ tone: 'error', message: 'Não foi possível dispensar a sugestão.' }),
    });
  }

  return {
    offered,
    offer: setOffered,
    accept,
    decline,
    isAccepting: acceptSuggestion.isPending,
  };
}

export type RuleSuggestionOffer = ReturnType<typeof useRuleSuggestionOffer>;
