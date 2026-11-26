import { Tag as TagIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormPanel } from '@/components/form-panel';
import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { RowsSkeleton } from '@/components/states/skeletons';
import { Button } from '@/components/ui/button';
import type { Tag } from '@/lib/api/tags';

import { EditableRow } from '../categories/editable-row';
import { TagForm } from './tag-form';
import { describeTagError, describeTransactionCount } from './tag-labels';
import { useDeleteTag, useRenameTag, useTags } from './tags-queries';

const TAGS_INTRO =
  'Etiquetas dão contexto a uma transação, como uma viagem ou uma despesa dedutível. Elas não entram em orçamentos nem no gasto por categoria: só servem para filtrar. Para criar uma, abra uma transação e use “Adicionar etiqueta”.';

function deleteDescription(tag: Tag): string {
  if (tag.transactionCount === 0)
    return 'Nenhuma transação usa esta etiqueta. Não dá para desfazer.';
  return `${describeTransactionCount(tag.transactionCount)} perdem esta etiqueta. As transações continuam, só sem ela. Não dá para desfazer.`;
}

interface TagRowProps {
  tag: Tag;
  onRename: () => void;
  onDelete: () => void;
}

function TagRow({ tag, onRename, onDelete }: TagRowProps) {
  return (
    <EditableRow
      editLabel={`Renomear etiqueta ${tag.name}`}
      onEdit={onRename}
      action={
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={`Excluir etiqueta ${tag.name}`}
          onClick={onDelete}
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </Button>
      }
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{tag.name}</span>
      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
        {describeTransactionCount(tag.transactionCount)}
      </span>
    </EditableRow>
  );
}

export function TagsTab() {
  const query = useTags();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const [renaming, setRenaming] = useState<Tag | undefined>(undefined);
  const [deleting, setDeleting] = useState<Tag | undefined>(undefined);

  if (query.isPending) return <RowsSkeleton rowCount={4} />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  function closeRenamePanel() {
    setRenaming(undefined);
    renameTag.reset();
  }

  function closeDeleteDialog() {
    setDeleting(undefined);
    deleteTag.reset();
  }

  return (
    <>
      <p className="max-w-prose text-sm text-muted-foreground">{TAGS_INTRO}</p>
      {query.data.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="Nenhuma etiqueta"
          description="Abra uma transação e use “Adicionar etiqueta” para criar a primeira."
        />
      ) : (
        <section className="rounded-lg border bg-card p-4 shadow-card">
          <h2 className="type-label mb-2">Etiquetas</h2>
          <ul className="divide-y divide-border">
            {query.data.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onRename={() => setRenaming(tag)}
                onDelete={() => setDeleting(tag)}
              />
            ))}
          </ul>
        </section>
      )}
      <FormPanel
        open={renaming !== undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeRenamePanel())}
        title="Renomear etiqueta"
        description="O novo nome vale em todas as transações que têm a etiqueta."
      >
        {renaming ? (
          <TagForm
            key={renaming.id}
            initialName={renaming.name}
            isPending={renameTag.isPending}
            errorMessage={renameTag.isError ? describeTagError(renameTag.error) : null}
            onCancel={closeRenamePanel}
            onSubmit={(name) =>
              renameTag.mutate({ tag: renaming, name }, { onSuccess: closeRenamePanel })
            }
          />
        ) : null}
      </FormPanel>
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(isOpen) => (isOpen ? undefined : closeDeleteDialog())}
        title={`Excluir a etiqueta ${deleting?.name ?? ''}?`}
        description={deleting ? deleteDescription(deleting) : ''}
        confirmLabel="Excluir"
        isPending={deleteTag.isPending}
        errorMessage={deleteTag.isError ? describeTagError(deleteTag.error) : null}
        onConfirm={() => {
          if (deleting) deleteTag.mutate(deleting, { onSuccess: closeDeleteDialog });
        }}
      />
    </>
  );
}
