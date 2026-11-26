import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_TAG_NAME_LENGTH } from '@/lib/api/tags';
import { OFFLINE_ACTION_HINT, useIsOffline } from '@/lib/pwa/connectivity';

interface TagFormProps {
  initialName: string;
  isPending: boolean;
  errorMessage: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function TagForm({
  initialName,
  isPending,
  errorMessage,
  onSubmit,
  onCancel,
}: TagFormProps) {
  const nameId = useId();
  const isOffline = useIsOffline();
  const [name, setName] = useState(initialName);
  const isNameEmpty = name.trim() === '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNameEmpty) return;
    onSubmit(name.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor={nameId}>Nome</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={MAX_TAG_NAME_LENGTH}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
        />
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending || isNameEmpty || isOffline}
          title={isOffline ? OFFLINE_ACTION_HINT : undefined}
        >
          Salvar
        </Button>
      </div>
    </form>
  );
}
