import { Check, Search } from 'lucide-react';
import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category } from '@/lib/api/categories';
import { normalizeSearchText } from '@/lib/text';

import { CategoryGlyph } from '../categories/category-icons';
import { KIND_LABELS, KIND_ORDER } from '../categories/category-labels';

interface CategoryPickerProps {
  categories: readonly Category[];
  currentCategoryId: string | null;
  /** Texto da caixa "Aplicar sempre para '<descrição>'". */
  applyAlwaysLabel: string;
  onPick: (category: Category, applyAlways: boolean) => void;
}

/**
 * Busca de categorias para trocar a escolha de uma transação. Só mostra as ativas e oferece a opção
 * "Aplicar sempre", que cria a regra; escolher uma categoria já grava a troca.
 */
export function CategoryPicker({
  categories,
  currentCategoryId,
  applyAlwaysLabel,
  onPick,
}: CategoryPickerProps) {
  const searchId = useId();
  const applyAlwaysId = useId();
  const [searchText, setSearchText] = useState('');
  const [applyAlways, setApplyAlways] = useState(false);
  const term = normalizeSearchText(searchText);
  const matches = categories.filter(
    (category) => !category.isArchived && normalizeSearchText(category.name).includes(term),
  );

  return (
    <div className="space-y-3">
      <label
        htmlFor={applyAlwaysId}
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border bg-card p-3 text-sm"
      >
        <input
          id={applyAlwaysId}
          type="checkbox"
          checked={applyAlways}
          onChange={(event) => setApplyAlways(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>{applyAlwaysLabel}</span>
      </label>
      <div className="space-y-1.5">
        <Label htmlFor={searchId}>Buscar categoria</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {matches.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {KIND_ORDER.map((kind) => {
            const kindMatches = matches.filter((category) => category.kind === kind);
            if (kindMatches.length === 0) return null;
            return (
              <section key={kind} aria-label={KIND_LABELS[kind]}>
                <h3 className="type-label px-1 pb-1">{KIND_LABELS[kind]}</h3>
                <ul>
                  {kindMatches.map((category) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() => onPick(category, applyAlways)}
                        aria-current={category.id === currentCategoryId ? 'true' : undefined}
                        className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CategoryGlyph name={category.icon} className="size-5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{category.name}</span>
                        {category.id === currentCategoryId ? (
                          <Check className="size-4 text-primary" aria-label="Categoria atual" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
