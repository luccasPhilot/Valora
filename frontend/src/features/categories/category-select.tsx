import type { ComponentProps } from 'react';

import { Select } from '@/components/ui/select';
import type { Category } from '@/lib/api/categories';

import { CategoryGlyph } from './category-icons';
import { KIND_LABELS, KIND_ORDER } from './category-labels';

function renderCategoryIcon(iconName: string) {
  return <CategoryGlyph name={iconName} className="size-4" />;
}

interface CategorySelectProps extends Omit<ComponentProps<'select'>, 'value' | 'onChange'> {
  categories: readonly Category[];
  /** Id escolhido, ou '' para "nada escolhido". */
  value: string;
  /** Texto da opção vazia; sem ele, não há opção vazia. */
  emptyLabel?: string;
  /** Opção extra logo após a vazia, como "Sem categoria" nos filtros. */
  extraOption?: { readonly value: string; readonly label: string };
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
  extraOption,
  onValueChange,
  ...props
}: CategorySelectProps) {
  const options = categories.filter((category) => !category.isArchived || category.id === value);
  return (
    <Select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      renderOptionIcon={renderCategoryIcon}
      {...props}
    >
      {emptyLabel === undefined ? null : <option value="">{emptyLabel}</option>}
      {extraOption ? <option value={extraOption.value}>{extraOption.label}</option> : null}
      {KIND_ORDER.map((kind) => {
        const kindOptions = options.filter((category) => category.kind === kind);
        if (kindOptions.length === 0) return null;
        return (
          <optgroup key={kind} label={KIND_LABELS[kind]}>
            {kindOptions.map((category) => (
              <option key={category.id} value={category.id} data-icon={category.icon}>
                {category.isArchived ? `${category.name} (arquivada)` : category.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
}
