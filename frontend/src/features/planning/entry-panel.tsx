import { Pause, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormPanel } from '@/components/form-panel';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/api/categories';
import type { PlannedEntry, PlannedEntryInput } from '@/lib/api/planned-entries';

import { EntryForm } from './entry-form';
import { type EntrySubmitOutcome, entryValuesFrom, newEntryValues } from './entry-form-values';

export type EntryPanelTarget =
  { readonly kind: 'create' } | { readonly kind: 'edit'; readonly entry: PlannedEntry };

interface EntryPanelProps {
  /** Nulo com o painel fechado. */
  target: EntryPanelTarget | null;
  /** `AAAA-MM` que a tela mostra: a nova previsão começa nele. */
  month: string;
  categories: readonly Category[];
  isSaving: boolean;
  isWorking: boolean;
  hasActionError: boolean;
  /** Sem id, cria; com id, edita. */
  onSave: (id: string | undefined, input: PlannedEntryInput) => Promise<EntrySubmitOutcome>;
  onTogglePaused: (entry: PlannedEntry) => void;
  onDelete: (entry: PlannedEntry) => void;
  onClose: () => void;
}

interface EditActionsProps {
  entry: PlannedEntry;
  isWorking: boolean;
  hasActionError: boolean;
  onTogglePaused: (entry: PlannedEntry) => void;
  onAskDelete: () => void;
}

function EditActions({
  entry,
  isWorking,
  hasActionError,
  onTogglePaused,
  onAskDelete,
}: EditActionsProps) {
  const ToggleIcon = entry.isActive ? Pause : Play;
  return (
    <div className="space-y-3 border-t pt-5">
      <p className="text-sm text-muted-foreground">
        {entry.isActive
          ? 'Pausar tira a previsão de todos os meses, sem apagar. Dá para reativar depois.'
          : 'Esta previsão está pausada e não aparece em nenhum mês.'}
      </p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isWorking}
        onClick={() => onTogglePaused(entry)}
      >
        <ToggleIcon aria-hidden="true" />
        {entry.isActive ? 'Pausar previsão' : 'Reativar previsão'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        disabled={isWorking}
        onClick={onAskDelete}
      >
        <Trash2 aria-hidden="true" />
        Excluir previsão
      </Button>
      {hasActionError ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível concluir. Tente de novo.
        </p>
      ) : null}
    </div>
  );
}

/** Painel da previsão: cria uma nova ou edita, pausa, reativa e exclui uma existente. */
export function EntryPanel({
  target,
  month,
  categories,
  isSaving,
  isWorking,
  hasActionError,
  onSave,
  onTogglePaused,
  onDelete,
  onClose,
}: EntryPanelProps) {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const entry = target?.kind === 'edit' ? target.entry : null;
  return (
    <>
      <FormPanel
        open={target !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
        title={entry ? 'Editar previsão' : 'Nova previsão'}
        description={entry ? entry.description : 'Uma receita ou despesa que você já sabe que vem'}
        focusOnOpenSelector='[data-autofocus="true"]'
      >
        {target ? (
          <div className="space-y-5">
            <EntryForm
              // Trocar de previsão (ou reabrir) recomeça o formulário do zero.
              key={entry?.id ?? 'create'}
              initialValues={entry ? entryValuesFrom(entry) : newEntryValues(month)}
              categories={categories}
              showsEditWarning={entry !== null && entry.recurrence !== 'none'}
              isPending={isSaving}
              submitLabel={entry ? 'Salvar previsão' : 'Criar previsão'}
              onSubmit={(input) => onSave(entry?.id, input)}
            />
            {entry ? (
              <EditActions
                entry={entry}
                isWorking={isWorking}
                hasActionError={hasActionError}
                onTogglePaused={onTogglePaused}
                onAskDelete={() => setConfirmingDelete(true)}
              />
            ) : null}
          </div>
        ) : null}
      </FormPanel>
      <ConfirmDialog
        open={isConfirmingDelete && entry !== null}
        onOpenChange={setConfirmingDelete}
        title="Excluir previsão?"
        description="A previsão some de todos os meses, junto com o que você marcou como realizada ou pulada. As transações não são apagadas."
        confirmLabel="Excluir"
        isPending={isWorking}
        errorMessage={hasActionError ? 'Não foi possível excluir. Tente de novo.' : null}
        onConfirm={() => {
          if (!entry) return;
          setConfirmingDelete(false);
          onDelete(entry);
        }}
      />
    </>
  );
}
