import { Download } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { useHideValues } from '@/components/hide-values-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { Notice } from '@/hooks/use-notice';
import type { TransactionQuery } from '@/lib/api/transactions';
import { formatCount } from '@/lib/format';

import { MAX_EXPORTED_TRANSACTIONS } from './transactions-export';
import { type TransactionsExportState, useTransactionsExport } from './use-transactions-export';

const FULL_PERCENT = 100;

interface ExportCsvButtonProps {
  query: TransactionQuery;
  showNotice: (notice: Notice) => void;
}

/** "Exportar CSV" de Transações: todas as transações do filtro, não só as da tela. */
export function ExportCsvButton({ query, showNotice }: ExportCsvButtonProps) {
  const { areValuesHidden } = useHideValues();
  const exportCsv = useTransactionsExport({ query, showNotice });
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  function requestExport() {
    if (areValuesHidden) {
      setIsWarningOpen(true);
      return;
    }
    void exportCsv.start();
  }

  function confirmExport() {
    setIsWarningOpen(false);
    void exportCsv.start();
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={exportCsv.state.step === 'preparing'}
        onClick={requestExport}
      >
        <Download aria-hidden="true" />
        Exportar CSV
      </Button>
      <ConfirmDialog
        open={isWarningOpen}
        onOpenChange={setIsWarningOpen}
        title="Exportar com os valores?"
        description="O arquivo terá os valores, mesmo com eles ocultos na tela."
        confirmLabel="Exportar CSV"
        confirmVariant="default"
        isPending={false}
        errorMessage={null}
        onConfirm={confirmExport}
      />
      <ExportStatusDialog
        state={exportCsv.state}
        onCancel={exportCsv.cancel}
        onDismiss={exportCsv.dismiss}
      />
    </>
  );
}

interface ExportStatusDialogProps {
  state: TransactionsExportState;
  onCancel: () => void;
  onDismiss: () => void;
}

/** O progresso enquanto busca as páginas, ou o pedido para estreitar o filtro quando passa do limite. */
function ExportStatusDialog({ state, onCancel, onDismiss }: ExportStatusDialogProps) {
  if (state.step === 'too_many') {
    return (
      <Dialog open onOpenChange={onDismiss}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtro grande demais para exportar</DialogTitle>
            <DialogDescription>
              {`O filtro tem ${formatCount(state.totalCount)} transações, e o CSV leva até ${formatCount(MAX_EXPORTED_TRANSACTIONS)}. Escolha um período menor e exporte de novo.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onDismiss}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={state.step === 'preparing'} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportando CSV</DialogTitle>
          <DialogDescription aria-live="polite">
            {state.step === 'preparing' ? preparingLabel(state.progress) : null}
          </DialogDescription>
        </DialogHeader>
        <Progress
          value={state.step === 'preparing' ? progressPercent(state.progress) : 0}
          aria-label="Transações preparadas"
          indicatorClassName="bg-primary"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PreparingProgress = Extract<TransactionsExportState, { step: 'preparing' }>['progress'];

function preparingLabel(progress: PreparingProgress): string {
  if (!progress) return 'Preparando…';
  return `Preparando ${formatCount(progress.loadedCount)} de ${formatCount(progress.totalCount)}…`;
}

function progressPercent(progress: PreparingProgress): number {
  if (!progress || progress.totalCount === 0) return 0;
  return (progress.loadedCount / progress.totalCount) * FULL_PERCENT;
}
