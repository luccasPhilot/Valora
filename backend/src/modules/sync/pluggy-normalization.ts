import { centsSchema } from '../../shared/money.js';
import type { SyncedAccountType } from './sync.types.js';

const CENTS_PER_REAL = 100;
const LAST_DIGITS_COUNT = 4;
const NON_DIGIT_PATTERN = /\D/g;

export type PluggyTransactionType = 'DEBIT' | 'CREDIT';

// A única conversão de reais para centavos do Valora. Recusa o que passa do inteiro seguro.
export function toCents(amountInReais: number): number {
  return centsSchema.parse(Math.round(amountInReais * CENTS_PER_REAL));
}

// Confirmado com dados reais (docs/04-modelo-de-dados.md): o Pluggy inverte o sinal no cartão, mas o
// `type` é coerente nos dois tipos de conta. DEBIT = sai da conta, CREDIT = entra.
export function normalizeAmount(
  amountInReais: number,
  transactionType: PluggyTransactionType,
): number {
  const magnitude = toCents(Math.abs(amountInReais));
  if (transactionType === 'CREDIT' || magnitude === 0) return magnitude;
  return -magnitude;
}

export function toAccountType(
  type: 'BANK' | 'CREDIT',
  subtype: string | null | undefined,
): SyncedAccountType {
  if (type === 'CREDIT' || subtype === 'CREDIT_CARD') return 'credit_card';
  if (subtype === 'SAVINGS_ACCOUNT') return 'savings';
  return 'checking';
}

export function toLastDigits(accountNumber: string | null | undefined): string | null {
  const digits = (accountNumber ?? '').replace(NON_DIGIT_PATTERN, '');
  return digits.length === 0 ? null : digits.slice(-LAST_DIGITS_COUNT);
}
