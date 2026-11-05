import type { ComponentProps } from 'react';

import { Select } from '@/components/ui/select';
import type { Category } from '@/lib/api/categories';

import { KIND_LABELS, KIND_ORDER } from './category-labels';

interface CategorySelectProps extends Omit<ComponentProps<'select'>, 'value' | 'onChange'> {
  categories: readonly Category[];
  /** Id escolhido, ou '' para "nada escolhido". */
  value: string;
  /** Texto da opção vazia; sem ele, não há opção vazia. */
  emptyLabel?: string;
  onValueChange: (categoryId: string) => void;
}

/**
 * Lista de categorias agrupada por tipo. Só as ativas são opções novas; a categoria já escolhida
 * continua aparecendo mesmo arquivada, para o campo não ficar em branco.
 */
export function CategorySelect({
  categories,
  value,
  emptyLabel,
  onValueChange,
  ...props
}: CategorySelectProps) {
  const options = categories.filter((category) => !category.isArchived || category.id === value);
  return (
    <Select value={value} onChange={(event) => onValueChange(event.target.value)} {...props}>
      {emptyLabel === undefined ? null : <option value="">{emptyLabel}</option>}
      {KIND_ORDER.map((kind) => {
        const kindOptions = options.filter((category) => category.kind === kind);
        if (kindOptions.length === 0) return null;
        return (
          <optgroup key={kind} label={KIND_LABELS[kind]}>
            {kindOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.isArchived ? `${category.name} (arquivada)` : category.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}
