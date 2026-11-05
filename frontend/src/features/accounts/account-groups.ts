import type { Account, AccountConnection, AccountType } from '@/lib/api/accounts';
import { isConnectionBroken } from '@/lib/connection-status';

export interface InstitutionGroup {
  readonly connectionId: string;
  readonly connection: AccountConnection;
  readonly accounts: readonly Account[];
  readonly hasProblem: boolean;
}

export const ACCOUNT_TYPE_LABELS: Readonly<Record<AccountType, string>> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de crédito',
  cash: 'Dinheiro',
};

/**
 * Um grupo por conexão, na ordem em que a API devolveu. A conta "Dinheiro" fica de fora:
 * não pertence a banco nenhum e não tem saldo para mostrar.
 */
export function groupByInstitution(accounts: readonly Account[]): InstitutionGroup[] {
  const groups = new Map<string, { connection: AccountConnection; accounts: Account[] }>();
  for (const account of accounts) {
    if (account.type === 'cash' || account.connection === null) continue;
    const group = groups.get(account.connection.id);
    if (group) group.accounts.push(account);
    else groups.set(account.connection.id, { connection: account.connection, accounts: [account] });
  }
  return [...groups.entries()].map(([connectionId, { connection, accounts: members }]) => ({
    connectionId,
    connection,
    accounts: members,
    hasProblem: isConnectionBroken(connection.status),
  }));
}
