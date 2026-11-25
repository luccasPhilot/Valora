import { ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { RuleSuggestionOffer } from './use-rule-suggestion-offer';

interface RuleSuggestionPromptProps {
  offer: RuleSuggestionOffer;
}

function describeCorrections(count: number, categoryName: string): string {
  return `Você já pôs ${count} transações com esta descrição em ${categoryName}.`;
}

/** Aparece no pé da tela depois de uma troca de categoria que já pede uma regra. Não bloqueia a tela. */
export function RuleSuggestionPrompt({ offer }: RuleSuggestionPromptProps) {
  const suggestion = offer.offered;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[60] flex justify-center"
    >
      {suggestion ? (
        <section
          aria-label="Sugestão de regra"
          className="pointer-events-auto w-full max-w-md space-y-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-overlay"
        >
          <div className="flex items-start gap-3">
            <ListFilter className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold break-words">
                Criar regra para “{suggestion.pattern}” → {suggestion.categoryName}?
              </p>
              <p className="text-sm text-muted-foreground">
                {describeCorrections(suggestion.correctionCount, suggestion.categoryName)}
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 min-[25rem]:flex-row min-[25rem]:justify-end">
            <Button variant="ghost" disabled={offer.isAccepting} onClick={offer.decline}>
              Agora não
            </Button>
            <Button disabled={offer.isAccepting} onClick={offer.accept}>
              {offer.isAccepting ? 'Criando…' : 'Criar regra'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
