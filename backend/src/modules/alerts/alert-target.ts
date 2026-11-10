import type { AlertType } from './alert-situations.js';
import type { AlertTransaction } from './alerts.repository.js';

// A busca de Transações aceita até 100 caracteres.
const MAX_SEARCH_LENGTH = 100;

export type AlertTarget =
  | { readonly screen: 'budgets'; readonly month: string; readonly categoryId: string }
  | { readonly screen: 'accounts' }
  | {
      readonly screen: 'transactions';
      readonly from: string;
      readonly to: string;
      readonly search: string;
    };

export interface AlertTargetSource {
  readonly type: AlertType;
  readonly dedupeKey: string;
  readonly categoryId: string | null;
  readonly transaction: AlertTransaction | null;
}

// O mês do orçamento vai no fim da chave de deduplicação (`budget_warning:<categoria>:AAAA-MM`).
const MONTH_PATTERN = /:(\d{4}-\d{2})$/;

/** Tela relacionada ao alerta, ou `null` para tipos que ainda não têm uma. */
export function alertTarget(alert: AlertTargetSource): AlertTarget | null {
  if (alert.type === 'connection_error') return { screen: 'accounts' };
  if (alert.type === 'duplicate_charge' || alert.type === 'subscription_detected') {
    return transactionTarget(alert.transaction);
  }
  if (alert.type !== 'budget_warning' && alert.type !== 'budget_exceeded') return null;
  const month = MONTH_PATTERN.exec(alert.dedupeKey)?.[1];
  if (!month || !alert.categoryId) return null;
  return { screen: 'budgets', month, categoryId: alert.categoryId };
}

/** Transações no dia da cobrança, pesquisando pela descrição. */
function transactionTarget(transaction: AlertTransaction | null): AlertTarget | null {
  if (!transaction) return null;
  return {
    screen: 'transactions',
    from: transaction.date,
    to: transaction.date,
    search: transaction.descriptionNormalized.slice(0, MAX_SEARCH_LENGTH),
  };
}
