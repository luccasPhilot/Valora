import { Button } from '@/components/ui/button';
import type { Notice } from '@/hooks/use-notice';
import type { RuleSuggestion } from '@/lib/api/categories';

import {
  useAcceptRuleSuggestion,
  useDismissRuleSuggestion,
  useRuleSuggestions,
} from './categories-queries';
import { CategoryBadgeIcon } from './category-icons';
import { MATCH_TYPE_LABELS } from './category-labels';

interface RuleSuggestionsListProps {
  showNotice: (notice: Notice) => void;
}

function describeCorrections(count: number): string {
  return `${count} correções suas`;
}

function suggestionKey(suggestion: RuleSuggestion): string {
  return `${suggestion.pattern}:${suggestion.categoryId}`;
}

/**
 * "Sugestões" acima das regras: o que as suas correções já pedem. Sem sugestão, a seção some;
 * carregando, também (as regras são o conteúdo principal da aba).
 */
export function RuleSuggestionsList({ showNotice }: RuleSuggestionsListProps) {
  const suggestionsQuery = useRuleSuggestions();
  const acceptSuggestion = useAcceptRuleSuggestion();
  const dismissSuggestion = useDismissRuleSuggestion();

  if (suggestionsQuery.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar as sugestões.{' '}
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => void suggestionsQuery.refetch()}
        >
          Tentar de novo
        </Button>
      </p>
    );
  }
  const suggestions = suggestionsQuery.data ?? [];
  if (suggestions.length === 0) return null;
  const isPending = acceptSuggestion.isPending || dismissSuggestion.isPending;

  function accept(suggestion: RuleSuggestion) {
    acceptSuggestion.mutate(suggestion, {
      onSuccess: () => showNotice({ tone: 'success', message: 'Regra criada.' }),
      onError: () =>
        showNotice({ tone: 'error', message: 'Não foi possível criar a regra. Tente de novo.' }),
    });
  }

  function dismiss(suggestion: RuleSuggestion) {
    dismissSuggestion.mutate(suggestion, {
      onError: () =>
        showNotice({ tone: 'error', message: 'Não foi possível dispensar a sugestão.' }),
    });
  }

  return (
    <section aria-labelledby="rule-suggestions-title" className="space-y-2">
      <h2 id="rule-suggestions-title" className="font-display text-lg font-semibold">
        Sugestões
      </h2>
      <ul className="divide-y divide-border rounded-lg border bg-card px-4 shadow-card">
        {suggestions.map((suggestion) => (
          <li
            key={suggestionKey(suggestion)}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <CategoryBadgeIcon name={suggestion.categoryIcon} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium break-words">
                  <span className="text-muted-foreground">{MATCH_TYPE_LABELS.equals} </span>
                  {suggestion.pattern} → {suggestion.categoryName}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {describeCorrections(suggestion.correctionCount)}
                </span>
              </span>
            </span>
            <span className="flex gap-2 pl-[3.25rem] sm:shrink-0 sm:pl-0">
              <Button
                variant="ghost"
                disabled={isPending}
                aria-label={`Dispensar sugestão ${suggestion.pattern}`}
                onClick={() => dismiss(suggestion)}
              >
                Dispensar
              </Button>
              <Button
                variant="outline"
                disabled={isPending}
                aria-label={`Criar regra ${suggestion.pattern}`}
                onClick={() => accept(suggestion)}
              >
                Criar regra
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
