import { StickyNote } from 'lucide-react';

import type { Transaction } from '@/lib/api/transactions';

const MAX_TAGS_IN_ROW = 2;

export function hasAnnotationMarks(transaction: Transaction): boolean {
  return transaction.note !== null || transaction.tags.length > 0;
}

interface AnnotationMarksProps {
  transaction: Transaction;
}

/** Na linha da lista: o ícone de nota e até 2 etiquetas. No celular (< 768 px) só o ícone, para não espremer o valor. */
export function AnnotationMarks({ transaction }: AnnotationMarksProps) {
  const visibleTags = transaction.tags.slice(0, MAX_TAGS_IN_ROW);
  const hiddenCount = transaction.tags.length - visibleTags.length;
  return (
    <>
      {transaction.note !== null ? (
        <span className="inline-flex shrink-0 items-center text-muted-foreground">
          <StickyNote className="size-4" aria-hidden="true" />
          <span className="sr-only">Tem nota</span>
        </span>
      ) : null}
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className="max-w-28 truncate rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground max-md:hidden"
        >
          <span className="sr-only">Etiqueta </span>
          {tag.name}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="shrink-0 text-xs font-medium text-muted-foreground max-md:hidden">
          +{hiddenCount}
        </span>
      ) : null}
      {transaction.tags.length > 0 ? (
        <span className="sr-only md:hidden">
          {transaction.tags.length === 1 ? '1 etiqueta' : `${transaction.tags.length} etiquetas`}
        </span>
      ) : null}
    </>
  );
}
