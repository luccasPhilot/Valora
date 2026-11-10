import { Ban, Check, Link2, Pencil, Undo2 } from 'lucide-react';

import { FormPanel } from '@/components/form-panel';
import { Button } from '@/components/ui/button';
import type {
  LinkedTransaction,
  OccurrenceDecision,
  PlannedOccurrence,
} from '@/lib/api/planned-entries';
import { formatDate } from '@/lib/format';

import { PlannedAmount } from './planned-amount';
import { describeRealization, describeRecurrence } from './planning-labels';

interface OccurrencePanelProps {
  /** Nulo com o painel fechado. */
  occurrence: PlannedOccurrence | null;
  isSaving: boolean;
  hasError: boolean;
  onDecide: (occurrence: PlannedOccurrence, decision: OccurrenceDecision) => void;
  onUndo: (occurrence: PlannedOccurrence) => void;
  onEditEntry: (occurrence: PlannedOccurrence) => void;
  onClose: () => void;
}

interface CandidatesProps {
  candidates: readonly LinkedTransaction[];
  isSaving: boolean;
  onLink: (transaction: LinkedTransaction) => void;
}

function CandidateList({ candidates, isSaving, onLink }: CandidatesProps) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma transação parecida neste mês. Se o dinheiro ainda não apareceu, marque como
        realizada sem vincular.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-lg border">
      {candidates.map((candidate) => (
        <li key={candidate.id} className="flex items-center gap-3 p-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{candidate.description}</span>
            <span className="text-xs text-muted-foreground">{formatDate(candidate.date)}</span>
          </span>
          <PlannedAmount cents={candidate.amountCents} className="shrink-0 text-sm font-medium" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isSaving}
            aria-label={`Vincular ${candidate.description}`}
            onClick={() => onLink(candidate)}
          >
            <Link2 aria-hidden="true" />
            Vincular
          </Button>
        </li>
      ))}
    </ul>
  );
}

function PendingActions({
  occurrence,
  isSaving,
  onDecide,
}: Pick<OccurrencePanelProps, 'isSaving' | 'onDecide'> & { occurrence: PlannedOccurrence }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Vincular a uma transação</h3>
        <CandidateList
          candidates={occurrence.candidates}
          isSaving={isSaving}
          onLink={(transaction) =>
            onDecide(occurrence, { action: 'realize', transactionId: transaction.id })
          }
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => onDecide(occurrence, { action: 'realize' })}
        >
          <Check aria-hidden="true" />
          Marcar como realizada
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() => onDecide(occurrence, { action: 'skip' })}
        >
          <Ban aria-hidden="true" />
          Pular este mês
        </Button>
      </div>
    </div>
  );
}

function DecidedActions({
  occurrence,
  isSaving,
  onUndo,
}: Pick<OccurrencePanelProps, 'isSaving' | 'onUndo'> & { occurrence: PlannedOccurrence }) {
  const text =
    occurrence.status === 'realized' ? describeRealization(occurrence) : 'Pulada neste mês';
  return (
    <div className="space-y-3">
      <p className="text-sm">{text}</p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isSaving}
        onClick={() => onUndo(occurrence)}
      >
        <Undo2 aria-hidden="true" />
        Desfazer
      </Button>
    </div>
  );
}

/** Ações de uma ocorrência: vincular, realizar sem vincular, pular, desfazer, e abrir a previsão. */
export function OccurrencePanel({
  occurrence,
  isSaving,
  hasError,
  onDecide,
  onUndo,
  onEditEntry,
  onClose,
}: OccurrencePanelProps) {
  return (
    <FormPanel
      open={occurrence !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={occurrence?.entry.description ?? 'Previsão'}
      description={
        occurrence
          ? `${formatDate(occurrence.date)} · ${describeRecurrence(occurrence.entry)}`
          : 'Detalhes da previsão'
      }
    >
      {occurrence ? (
        <div className="space-y-5">
          <p className="font-display text-2xl font-bold">
            <PlannedAmount cents={occurrence.entry.amountCents} />
          </p>
          {occurrence.status === 'pending' ? (
            <PendingActions occurrence={occurrence} isSaving={isSaving} onDecide={onDecide} />
          ) : (
            <DecidedActions occurrence={occurrence} isSaving={isSaving} onUndo={onUndo} />
          )}
          {hasError ? (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível salvar. Tente de novo.
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => onEditEntry(occurrence)}
          >
            <Pencil aria-hidden="true" />
            Editar previsão
          </Button>
        </div>
      ) : null}
    </FormPanel>
  );
}
