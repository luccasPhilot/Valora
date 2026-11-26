import { useId, useState } from 'react';

import { Label } from '@/components/ui/label';
import type { Transaction } from '@/lib/api/transactions';

import { useSaveAnnotations } from './transactions-queries';

const MAX_NOTE_LENGTH = 500;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const STATUS_TEXT: Readonly<Record<SaveStatus, string>> = {
  idle: '',
  saving: 'Salvando…',
  saved: 'Salvo',
  error: 'Não foi possível salvar. Toque fora do campo para tentar de novo.',
};

interface TransactionNoteFieldProps {
  transaction: Transaction;
}

/** A nota é salva ao sair do campo, só se mudou; "Salvo" confirma sem fechar o detalhe. */
export function TransactionNoteField({ transaction }: TransactionNoteFieldProps) {
  const fieldId = useId();
  const statusId = useId();
  const saveAnnotations = useSaveAnnotations();
  const savedNote = transaction.note ?? '';
  const [text, setText] = useState(savedNote);
  const [status, setStatus] = useState<SaveStatus>('idle');

  function saveOnBlur() {
    const trimmedText = text.trim();
    if (trimmedText === savedNote) return;
    setStatus('saving');
    saveAnnotations.mutate(
      {
        transactionId: transaction.id,
        annotations: { note: trimmedText === '' ? null : trimmedText },
      },
      {
        onSuccess: () => {
          setText(trimmedText);
          setStatus('saved');
        },
        onError: () => setStatus('error'),
      },
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>Nota</Label>
      <textarea
        id={fieldId}
        value={text}
        rows={3}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Ex.: pedir reembolso, presente da Ana"
        aria-describedby={statusId}
        onChange={(event) => {
          setText(event.target.value);
          setStatus('idle');
        }}
        onBlur={saveOnBlur}
        className="min-h-20 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:text-sm dark:bg-input/30"
      />
      <div className="flex items-start justify-between gap-3 text-sm">
        <p
          id={statusId}
          role="status"
          className={status === 'error' ? 'text-destructive' : 'text-muted-foreground'}
        >
          {STATUS_TEXT[status]}
        </p>
        <p className="shrink-0 text-muted-foreground tabular-nums">
          {text.length}/{MAX_NOTE_LENGTH}
        </p>
      </div>
    </div>
  );
}
