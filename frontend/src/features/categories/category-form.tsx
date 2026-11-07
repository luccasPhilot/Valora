import { type FormEvent, useId, useState } from 'react';

import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Category, CategoryInput, CategoryKind } from '@/lib/api/categories';

import { KIND_OPTION_LABELS, KIND_ORDER } from './category-labels';
import { IconPicker } from './icon-picker';

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
