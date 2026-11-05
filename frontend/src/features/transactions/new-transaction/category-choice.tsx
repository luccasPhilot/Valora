import { Check, Search } from 'lucide-react';
import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import type { Category } from '@/lib/api/categories';
import { normalizeSearchText } from '@/lib/text';

import { CategoryGlyph } from '../../categories/category-icons';

interface CategoryChoiceProps {
  /** Só as categorias que podem ser escolhidas (ativas e do tipo do lançamento). */
  categories: readonly Category[];
  value: string;
  errorId: string;
  hasError: boolean;
  onChange: (categoryId: string) => void;
}

/** Busca de categorias para o formulário: um toque escolhe, e a escolhida leva um check. */
export function CategoryChoice({
  categories,
  value,
  errorId,
  hasError,
  onChange,
}: CategoryChoiceProps) {
  const labelId = useId();
  const [searchText, setSearchText] = useState('');
  const term = normalizeSearchText(searchText);
  const matches = categories.filter((category) =>
    normalizeSearchText(category.name).includes(term),
  );

  return (
    <div className="space-y-2">
      <span id={labelId} className="text-sm leading-5 font-medium">
        Categoria
      </span>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Buscar categoria"
          aria-label="Buscar categoria"
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          autoComplete="off"
          className="pl-9"
        />
      </div>
      {matches.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={labelId}
          className="max-h-44 overflow-y-auto rounded-md border p-1"
        >
          {matches.map((category) => {
            const isSelected = category.id === value;
            return (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(category.id)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected ? 'bg-secondary font-semibold text-secondary-foreground' : ''
                }`}
              >
                <CategoryGlyph name={category.icon} className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{category.name}</span>
                {isSelected ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
