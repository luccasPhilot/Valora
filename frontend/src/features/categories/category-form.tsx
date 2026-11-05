import { type FormEvent, useId, useState } from 'react';

import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category, CategoryInput, CategoryKind } from '@/lib/api/categories';

import { CategoryGlyph, SUGGESTED_ICON_NAMES } from './category-icons';
import { KIND_OPTION_LABELS, KIND_ORDER } from './category-labels';

const DEFAULT_ICON = 'tag';
const MAX_NAME_LENGTH = 60;
const KIND_OPTIONS = KIND_ORDER.map((kind) => ({ value: kind, label: KIND_OPTION_LABELS[kind] }));

interface CategoryFormProps {
  category: Category | null;
  isPending: boolean;
  errorMessage: string | null;
  onSubmit: (input: CategoryInput) => void;
  onCancel: () => void;
}

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

function IconPicker({ value, onChange }: IconPickerProps) {
  const labelId = useId();
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const visibleIcons = SUGGESTED_ICON_NAMES.filter((iconName) => iconName.includes(term));

  return (
    <div className="space-y-2">
      <span id={labelId} className="text-sm leading-5 font-medium">
        Ícone
      </span>
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar ícone (em inglês, ex.: car)"
        aria-label="Buscar ícone"
      />
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid max-h-40 grid-cols-5 gap-1 overflow-y-auto rounded-md border p-1 sm:grid-cols-6"
      >
        {visibleIcons.map((iconName) => {
          const isSelected = iconName === value;
          return (
            <button
              key={iconName}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={iconName}
              title={iconName}
              onClick={() => onChange(iconName)}
              className={`flex h-11 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected ? 'bg-secondary text-primary ring-2 ring-primary' : 'text-foreground'
              }`}
            >
              <CategoryGlyph name={iconName} />
            </button>
          );
        })}
      </div>
      {visibleIcons.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum ícone com esse nome.</p>
      ) : null}
    </div>
  );
}

export function CategoryForm({
  category,
  isPending,
  errorMessage,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const nameId = useId();
  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? 'expense');
  const [icon, setIcon] = useState(category?.icon ?? DEFAULT_ICON);
  const isNameEmpty = name.trim() === '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNameEmpty) return;
    onSubmit({ name: name.trim(), kind, icon });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor={nameId}>Nome</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={isNameEmpty && name !== ''}
          autoComplete="off"
        />
      </div>
      <SegmentedControl label="Tipo" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <IconPicker value={icon} onChange={setIcon} />
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || isNameEmpty}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
