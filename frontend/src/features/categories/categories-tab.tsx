import { Archive, Plus, Tags } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormPanel } from '@/components/form-panel';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/api/categories';

import { useArchiveCategory, useCategories, useSaveCategory } from './categories-queries';
import { CategoryForm } from './category-form';
import { CategoryBadgeIcon } from './category-icons';
import { describeError, KIND_LABELS, KIND_ORDER } from './category-labels';

const TRANSFER_NOTE =
  'Transferências não entram nos totais de receitas e despesas. Um saque chega do banco como despesa, na categoria “Saque”. Se você também lançar à mão o que gastou com esse dinheiro, troque o saque para uma transferência, para não contar duas vezes.';

// `null` = criando uma categoria nova; `undefined` = painel fechado.
type EditorTarget = Category | null | undefined;

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onArchive: () => void;
}

function CategoryRow({ category, onEdit, onArchive }: CategoryRowProps) {
  return (
    <li className="flex items-center gap-1 py-1">
      <button
        type="button"
        aria-label={`Editar ${category.name}`}
        onClick={onEdit}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategoryBadgeIcon name={category.icon} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label={`Arquivar ${category.name}`}
        onClick={onArchive}
      >
        <Archive className="size-5" aria-hidden="true" />
      </Button>
    </li>
  );
}

interface CategoryGroupsProps {
  categories: readonly Category[];
  onEdit: (category: Category) => void;
  onArchive: (category: Category) => void;
}

function CategoryGroups({ categories, onEdit, onArchive }: CategoryGroupsProps) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {KIND_ORDER.map((kind) => {
        const kindCategories = categories.filter((category) => category.kind === kind);
        return (
          <section key={kind} className="rounded-lg border bg-card p-4 shadow-card">
            <h2 className="type-label mb-2">{KIND_LABELS[kind]}</h2>
            {kindCategories.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma categoria.</p>
            ) : (
              <ul className="divide-y divide-border">
                {kindCategories.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={() => onEdit(category)}
                    onArchive={() => onArchive(category)}
                  />
                ))}
              </ul>
            )}
            {kind === 'transfer' ? (
              <p className="mt-3 text-sm text-muted-foreground">{TRANSFER_NOTE}</p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

export function CategoriesTab() {
  const query = useCategories();
  const saveCategory = useSaveCategory();
  const archiveCategory = useArchiveCategory();
  const [editing, setEditing] = useState<EditorTarget>(undefined);
  const [archiving, setArchiving] = useState<Category | undefined>(undefined);

  if (query.isPending) return <RowsSkeleton rowCount={6} />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const activeCategories = query.data.filter((category) => !category.isArchived);

  function closeEditor() {
    setEditing(undefined);
    saveCategory.reset();
  }

  function closeArchiveDialog() {
    setArchiving(undefined);
    archiveCategory.reset();
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" />
          Nova categoria
        </Button>
      </div>
      {activeCategories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          description="Crie uma categoria para organizar suas transações."
        />
      ) : (
        <CategoryGroups
          categories={activeCategories}
          onEdit={setEditing}
          onArchive={setArchiving}
        />
      )}
      <FormPanel
        open={editing !== undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeEditor())}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description="Nome, tipo e ícone. Categorias não têm cor."
      >
        {editing !== undefined ? (
          <CategoryForm
            key={editing?.id ?? 'new'}
            category={editing}
            isPending={saveCategory.isPending}
            errorMessage={saveCategory.isError ? describeError(saveCategory.error) : null}
            onCancel={closeEditor}
            onSubmit={(input) =>
              saveCategory.mutate(
                { categoryId: editing?.id ?? null, input },
                { onSuccess: closeEditor },
              )
            }
          />
        ) : null}
      </FormPanel>
      <ConfirmDialog
        open={archiving !== undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeArchiveDialog())}
        title={`Arquivar ${archiving?.name ?? 'categoria'}?`}
        description="As transações antigas continuam nela, mas ela deixa de aparecer como opção para novas escolhas."
        confirmLabel="Arquivar"
        isPending={archiveCategory.isPending}
        errorMessage={archiveCategory.isError ? describeError(archiveCategory.error) : null}
        onConfirm={() => {
          if (archiving) archiveCategory.mutate(archiving, { onSuccess: closeArchiveDialog });
        }}
      />
    </>
  );
}
