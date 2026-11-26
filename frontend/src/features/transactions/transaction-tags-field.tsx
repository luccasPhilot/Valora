import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MAX_TAG_NAME_LENGTH, MAX_TAGS_PER_TRANSACTION, type Tag } from '@/lib/api/tags';
import type { Transaction } from '@/lib/api/transactions';
import { normalizeSearchText } from '@/lib/text';

import { describeTagError, isSameTagName } from '../tags/tag-labels';
import { useCreateTag, useTags } from '../tags/tags-queries';
import { useSaveAnnotations } from './transactions-queries';

interface TransactionTagsFieldProps {
  transaction: Transaction;
}

interface TagPickerProps {
  allTags: readonly Tag[];
  assignedIds: ReadonlySet<string>;
  isBusy: boolean;
  errorMessage: string | null;
  onPick: (tag: Pick<Tag, 'id'>) => void;
  onCreate: (name: string) => void;
}

/** Busca entre as etiquetas que a transação ainda não tem; sem nome igual, oferece "Criar". */
function TagPicker({
  allTags,
  assignedIds,
  isBusy,
  errorMessage,
  onPick,
  onCreate,
}: TagPickerProps) {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const normalizedSearch = normalizeSearchText(search);
  const options = allTags.filter(
    (tag) => !assignedIds.has(tag.id) && normalizeSearchText(tag.name).includes(normalizedSearch),
  );
  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch !== '' && !allTags.some((tag) => isSameTagName(tag.name, trimmedSearch));
  return (
    <div className="space-y-2">
      <label htmlFor={searchId} className="sr-only">
        Buscar etiqueta
      </label>
      <Input
        id={searchId}
        type="search"
        value={search}
        maxLength={MAX_TAG_NAME_LENGTH}
        placeholder="Buscar ou criar etiqueta"
        autoComplete="off"
        onChange={(event) => setSearch(event.target.value)}
      />
      <ul aria-label="Etiquetas" className="max-h-56 overflow-y-auto">
        {options.map((tag) => (
          <li key={tag.id}>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onPick(tag)}
              className="flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <span className="truncate">{tag.name}</span>
            </button>
          </li>
        ))}
        {canCreate ? (
          <li>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onCreate(trimmedSearch)}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Criar “{trimmedSearch}”</span>
            </button>
          </li>
        ) : null}
      </ul>
      {options.length === 0 && !canCreate ? (
        <p className="px-2 text-sm text-muted-foreground">
          {allTags.length === 0
            ? 'Nenhuma etiqueta ainda. Digite um nome para criar a primeira.'
            : 'Nenhuma etiqueta encontrada.'}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="px-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/** Etiquetas da transação: chips removíveis e "Adicionar etiqueta" (busca, com "Criar" quando não existe). */
export function TransactionTagsField({ transaction }: TransactionTagsFieldProps) {
  const tagsQuery = useTags();
  const createTag = useCreateTag();
  const saveAnnotations = useSaveAnnotations();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const currentIds = transaction.tags.map((tag) => tag.id);
  const isFull = currentIds.length >= MAX_TAGS_PER_TRANSACTION;
  const failure = createTag.error ?? saveAnnotations.error;

  function saveIds(tagIds: string[], onDone?: () => void) {
    saveAnnotations.mutate(
      { transactionId: transaction.id, annotations: { tagIds } },
      { onSuccess: onDone },
    );
  }

  function pickTag(tag: Pick<Tag, 'id'>) {
    saveIds([...currentIds, tag.id], () => setIsPickerOpen(false));
  }

  function createAndPick(name: string) {
    createTag.mutate(name, { onSuccess: (created) => pickTag(created) });
  }

  return (
    <section aria-labelledby="transaction-tags-title" className="space-y-2">
      <h3 id="transaction-tags-title" className="text-sm font-medium">
        Etiquetas
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {transaction.tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma etiqueta nesta transação.</p>
        ) : null}
        <ul aria-label="Etiquetas da transação" className="contents">
          {transaction.tags.map((tag) => (
            <li key={tag.id}>
              <span className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-full bg-secondary pl-3 text-sm font-medium text-secondary-foreground">
                <span className="truncate">{tag.name}</span>
                <button
                  type="button"
                  aria-label={`Remover etiqueta ${tag.name}`}
                  disabled={saveAnnotations.isPending}
                  onClick={() => saveIds(currentIds.filter((tagId) => tagId !== tag.id))}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={isFull}>
              <Plus aria-hidden="true" />
              Adicionar etiqueta
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            aria-label="Adicionar etiqueta"
            className="w-[min(20rem,calc(100vw-2rem))] p-3"
          >
            <TagPicker
              allTags={tagsQuery.data ?? []}
              assignedIds={new Set(currentIds)}
              isBusy={createTag.isPending || saveAnnotations.isPending}
              errorMessage={failure ? describeTagError(failure) : null}
              onPick={pickTag}
              onCreate={createAndPick}
            />
          </PopoverContent>
        </Popover>
      </div>
      {isFull ? (
        <p className="text-sm text-muted-foreground">
          Uma transação aceita até {MAX_TAGS_PER_TRANSACTION} etiquetas.
        </p>
      ) : null}
      {saveAnnotations.isError && !isPickerOpen ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível salvar as etiquetas. Tente de novo.
        </p>
      ) : null}
    </section>
  );
}
