import { useCallback, useEffect, useRef, useState } from 'react';

import type { Notice } from '@/hooks/use-notice';
import type { TransactionQuery } from '@/lib/api/transactions';
import { downloadFile } from '@/lib/download-file';
import { formatCount } from '@/lib/format';

import { transactionsCsvFileName, transactionsToCsv } from './transactions-csv';
import { type ExportProgress, fetchTransactionsForExport } from './transactions-export';

const CSV_MIME_TYPE = 'text/csv;charset=utf-8';
const EXPORT_FAILED_MESSAGE = 'Não deu para exportar o CSV. Tente de novo.';

export type TransactionsExportState =
  | { readonly step: 'idle' }
  | { readonly step: 'preparing'; readonly progress: ExportProgress | null }
  | { readonly step: 'too_many'; readonly totalCount: number };

const IDLE: TransactionsExportState = { step: 'idle' };

interface TransactionsExportOptions {
  readonly query: TransactionQuery;
  readonly showNotice: (notice: Notice) => void;
}

function exportedMessage(count: number): string {
  return count === 1
    ? 'CSV com 1 transação baixado.'
    : `CSV com ${formatCount(count)} transações baixado.`;
}

/** "Exportar CSV": busca todas as páginas do filtro, monta o arquivo e baixa. */
export function useTransactionsExport({ query, showNotice }: TransactionsExportOptions) {
  const [state, setState] = useState<TransactionsExportState>(IDLE);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(async () => {
    const current = new AbortController();
    controller.current = current;
    setState({ step: 'preparing', progress: null });
    try {
      const result = await fetchTransactionsForExport(query, {
        signal: current.signal,
        onProgress: (progress) => setState({ step: 'preparing', progress }),
      });
      if (result.status === 'canceled') return;
      if (result.status === 'too_many') {
        setState({ step: 'too_many', totalCount: result.totalCount });
        return;
      }
      const csv = new Blob([transactionsToCsv(result.transactions)], { type: CSV_MIME_TYPE });
      downloadFile(csv, transactionsCsvFileName(query));
      setState(IDLE);
      showNotice({ tone: 'success', message: exportedMessage(result.transactions.length) });
    } catch {
      // A falha vira o aviso de erro na tela; o que já veio das outras páginas é descartado.
      if (current.signal.aborted) return;
      setState(IDLE);
      showNotice({ tone: 'error', message: EXPORT_FAILED_MESSAGE });
    }
  }, [query, showNotice]);

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState(IDLE);
  }, []);

  const dismiss = useCallback(() => setState(IDLE), []);

  return { state, start, cancel, dismiss };
}
