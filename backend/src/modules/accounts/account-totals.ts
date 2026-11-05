import type { AccountRecord } from './accounts.repository.js';

export interface AccountTotals {
  /** Corrente + poupança não ocultas. Cartões e "Dinheiro" ficam de fora. */
  readonly totalBalanceCents: number;
  /** Faturas atuais dos cartões não ocultos. */
  readonly openCreditCardBillsCents: number;
  /** Limites disponíveis dos cartões não ocultos. */
  readonly availableCreditCents: number;
}

type AccountForTotals = Pick<
  AccountRecord,
  'type' | 'isHidden' | 'balanceCents' | 'availableLimitCents'
>;

const BALANCE_ACCOUNT_TYPES: readonly AccountRecord['type'][] = ['checking', 'savings'];

function sumCents(values: readonly (number | null)[]): number {
  return values.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
}

// Única definição de saldo total do app: o Início usa esta mesma função.
export function calculateAccountTotals(accounts: readonly AccountForTotals[]): AccountTotals {
  const visibleAccounts = accounts.filter((account) => !account.isHidden);
  const creditCards = visibleAccounts.filter((account) => account.type === 'credit_card');
  const balanceAccounts = visibleAccounts.filter((account) =>
    BALANCE_ACCOUNT_TYPES.includes(account.type),
  );
  return {
    totalBalanceCents: sumCents(balanceAccounts.map((account) => account.balanceCents)),
    openCreditCardBillsCents: sumCents(creditCards.map((account) => account.balanceCents)),
    availableCreditCents: sumCents(creditCards.map((account) => account.availableLimitCents)),
  };
}
