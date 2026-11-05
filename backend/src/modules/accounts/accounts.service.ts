import type { AccountOption, AccountsRepository } from './accounts.repository.js';

const CASH_ACCOUNT_NAME = 'Dinheiro';

export class AccountsService {
  constructor(private readonly repository: AccountsRepository) {}

  // Sem paginação: são poucas contas (no máximo 5 bancos, decisão em docs/03-arquitetura.md).
  list(): Promise<AccountOption[]> {
    return this.repository.findAllOptions();
  }

  /** Roda a cada subida da API, depois das migrations. Devolve `true` só se criou a conta agora. */
  ensureCashAccount(): Promise<boolean> {
    return this.repository.insertCashAccountIfMissing(CASH_ACCOUNT_NAME);
  }
}
