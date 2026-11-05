import { SearchX } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Input } from '@/components/ui/input';
import type { Category, PluggyMapping } from '@/lib/api/categories';

import { useCategories, usePluggyMappings, useSetPluggyMapping } from './categories-queries';
import { describeError } from './category-labels';
import { CategorySelect } from './category-select';

const NO_CATEGORY_LABEL = 'Sem categoria';

interface MappingRowProps {
  mapping: PluggyMapping;
  categories: readonly Category[];
  isSaving: boolean;
  errorMessage: string | null;
  onChange: (categoryId: string | null) => void;
}

function MappingRow({ mapping, categories, isSaving, errorMessage, onChange }: MappingRowProps) {
  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] sm:items-center sm:gap-4">
      <span className="min-w-0 truncate text-sm font-medium">{mapping.pluggyCategory}</span>
      <div className="space-y-1">
        <CategorySelect
          aria-label={`Categoria do Valora para ${mapping.pluggyCategory}`}
          categories={categories}
          value={mapping.categoryId ?? ''}
          emptyLabel={NO_CATEGORY_LABEL}
          disabled={isSaving}
          onValueChange={(categoryId) => onChange(categoryId === '' ? null : categoryId)}
        />
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function PluggyTab() {
  const mappingsQuery = usePluggyMappings();
  const categoriesQuery = useCategories();
  const setMapping = useSetPluggyMapping();
  const [search, setSearch] = useState('');

  if (mappingsQuery.isPending || categoriesQuery.isPending) return <RowsSkeleton rowCount={6} />;
  if (mappingsQuery.isError || categoriesQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void mappingsQuery.refetch();
          void categoriesQuery.refetch();
        }}
      />
    );
  }
  const term = search.trim().toLowerCase();
  const visibleMappings = mappingsQuery.data.filter((mapping) =>
    mapping.pluggyCategory.toLowerCase().includes(term),
  );
  const pendingCategory = setMapping.isPending ? setMapping.variables.pluggyCategory : null;
  const failedCategory = setMapping.isError ? setMapping.variables.pluggyCategory : null;

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">
        O Pluggy já sugere uma categoria para cada transação. Aqui você escolhe a qual categoria do
        Valora cada uma delas corresponde. Uma regra sempre vence esta tabela.
      </p>
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar categoria do Pluggy"
        aria-label="Buscar categoria do Pluggy"
        className="sm:max-w-sm"
      />
      {visibleMappings.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhuma categoria do Pluggy encontrada"
          description="Tente buscar por outro nome."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border bg-card px-4 shadow-card">
          {visibleMappings.map((mapping) => (
            <MappingRow
              key={mapping.pluggyCategory}
              mapping={mapping}
              categories={categoriesQuery.data}
              isSaving={pendingCategory === mapping.pluggyCategory}
              errorMessage={
                failedCategory === mapping.pluggyCategory ? describeError(setMapping.error) : null
              }
              onChange={(categoryId) =>
                setMapping.mutate({ pluggyCategory: mapping.pluggyCategory, categoryId })
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
