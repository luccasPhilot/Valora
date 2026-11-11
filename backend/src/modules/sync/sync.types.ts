// Tipos do Valora que saem do PluggyClient. Valores em centavos, sinal normalizado, datas AAAA-MM-DD.

export type SyncedAccountType = 'checking' | 'savings' | 'credit_card';
export type SyncedTransactionStatus = 'pending' | 'posted';

export interface SyncedAccount {
  readonly pluggyAccountId: string;
  readonly type: SyncedAccountType;
  readonly name: string;
  readonly numberLastDigits: string | null;
  readonly balanceCents: number;
  readonly creditLimitCents: number | null;
  readonly availableLimitCents: number | null;
  readonly raw: unknown;
}

export interface SyncedTransaction {
  readonly pluggyTransactionId: string;
  readonly date: string;
  readonly description: string;
  readonly descriptionNormalized: string;
  readonly amountCents: number;
  readonly status: SyncedTransactionStatus;
  readonly pluggyCategory: string | null;
  readonly installmentNumber: number | null;
  readonly installmentTotal: number | null;
  readonly raw: unknown;
}

export interface SyncedInvestment {
  readonly pluggyInvestmentId: string;
  readonly name: string;
  readonly type: string;
  readonly subtype: string | null;
  readonly balanceCents: number;
  readonly raw: unknown;
}

export interface SyncedCreditCardBill {
  readonly pluggyBillId: string;
  readonly dueDate: string;
  readonly closingDate: string | null;
  readonly totalCents: number;
  readonly minimumPaymentCents: number | null;
  /** Soma dos pagamentos já feitos da fatura. */
  readonly paidCents: number;
  readonly raw: unknown;
}

export interface TransactionWindow {
  /** Primeiro dia, AAAA-MM-DD, inclusive. */
  readonly from: string;
  /** Último dia, AAAA-MM-DD, inclusive. */
  readonly to: string;
}
