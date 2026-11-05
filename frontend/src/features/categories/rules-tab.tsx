import { ListFilter, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormPanel } from '@/components/form-panel';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import type { Category, CategoryRule } from '@/lib/api/categories';

import { useCategories, useCategoryRules, useDeleteRule, useSaveRule } from './categories-queries';
import { CategoryBadgeIcon } from './category-icons';
import { describeError, MATCH_TYPE_LABELS } from './category-labels';
import { RuleForm } from './rule-form';

const UNKNOWN_CATEGORY_NAME = 'Categoria removida';

// `null` = criando uma regra nova; `undefined` = painel fechado.
type EditorTarget = CategoryRule | null | undefined;

interface RuleRowProps {
  rule: CategoryRule;
  category: Category | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

function RuleRow({ rule, category, onEdit, onDelete }: RuleRowProps) {
  const categoryName = category?.name ?? UNKNOWN_CATEGORY_NAME;
  return (
    <li className="flex items-center gap-1 py-1">
      <button
        type="button"
        aria-label={`Editar regra ${rule.pattern}`}
        onClick={onEdit}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CategoryBadgeIcon name={category?.icon ?? 'tag'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            <span className="text-muted-foreground">{MATCH_TYPE_LABELS[rule.matchType]} </span>
            {rule.pattern}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {categoryName}
            {category?.isArchived ? ' (arquivada)' : ''}
            {rule.priority > 0 ? ` · prioridade ${rule.priority}` : ''}
            {rule.learnedFromTransactionId ? ' · aprendida de uma correção' : ''}
          </span>
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label={`Excluir regra ${rule.pattern}`}
        onClick={onDelete}
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </Button>
    </li>
  );
}

export function RulesTab() {
  const rulesQuery = useCategoryRules();
  const categoriesQuery = useCategories();
  const saveRule = useSaveRule();
  const deleteRule = useDeleteRule();
  const [editing, setEditing] = useState<EditorTarget>(undefined);
  const [deleting, setDeleting] = useState<CategoryRule | undefined>(undefined);

  if (rulesQuery.isPending || categoriesQuery.isPending) return <RowsSkeleton rowCount={4} />;
  if (rulesQuery.isError || categoriesQuery.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void rulesQuery.refetch();
          void categoriesQuery.refetch();
        }}
      />
    );
  }
  const categories = categoriesQuery.data;
  const rules = rulesQuery.data;

  function closeEditor() {
    setEditing(undefined);
    saveRule.reset();
  }

  function closeDeleteDialog() {
    setDeleting(undefined);
    deleteRule.reset();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Uma regra compara um texto com a descrição da transação. Ela vale também para as
          transações antigas, menos para as que você mesmo categorizou.
        </p>
        <Button onClick={() => setEditing(null)}>
          <Plus aria-hidden="true" />
          Nova regra
        </Button>
      </div>
      {rules.length === 0 ? (
        <EmptyState
          icon={ListFilter}
          title="Nenhuma regra ainda"
          description="Crie uma regra, por exemplo: descrição contém IFOOD → Alimentação."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border bg-card px-4 shadow-card">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              category={categories.find((category) => category.id === rule.categoryId)}
              onEdit={() => setEditing(rule)}
              onDelete={() => setDeleting(rule)}
            />
          ))}
        </ul>
      )}
      <FormPanel
        open={editing !== undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeEditor())}
        title={editing ? 'Editar regra' : 'Nova regra'}
        description="As transações que combinam com a regra mudam de categoria assim que você salvar."
      >
        {editing !== undefined ? (
          <RuleForm
            key={editing?.id ?? 'new'}
            rule={editing}
            categories={categories}
            isPending={saveRule.isPending}
            errorMessage={saveRule.isError ? describeError(saveRule.error) : null}
            onCancel={closeEditor}
            onSubmit={(input) =>
              saveRule.mutate({ ruleId: editing?.id ?? null, input }, { onSuccess: closeEditor })
            }
          />
        ) : null}
      </FormPanel>
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeDeleteDialog())}
        title="Excluir esta regra?"
        description="As transações que ela categorizou voltam para a categoria do Pluggy ou ficam sem categoria. As que você escolheu não mudam."
        confirmLabel="Excluir"
        isPending={deleteRule.isPending}
        errorMessage={deleteRule.isError ? describeError(deleteRule.error) : null}
        onConfirm={() => {
          if (deleting) deleteRule.mutate(deleting.id, { onSuccess: closeDeleteDialog });
        }}
      />
    </>
  );
}
