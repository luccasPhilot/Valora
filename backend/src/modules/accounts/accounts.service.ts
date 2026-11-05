import type { AccountOption, AccountsRepository } from './accounts.repository.js';

export class AccountsService {
  constructor(private readonly repository: AccountsRepository) {}

  // Sem paginação: são poucas contas (no máximo 5 bancos, decisão em docs/03-arquitetura.md).
  list(): Promise<AccountOption[]> {
    return this.repository.findAllOptions();
  }
}
