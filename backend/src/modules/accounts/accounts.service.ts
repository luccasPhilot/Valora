import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { type AccountTotals, calculateAccountTotals } from './account-totals.js';
import type { AccountRecord, AccountsRepository } from './accounts.repository.js';

const CASH_ACCOUNT_NAME = 'Dinheiro';

export interface AccountsOverview {
  readonly accounts: readonly AccountRecord[];
  readonly totals: AccountTotals;
}

export class AccountsService {
  constructor(private readonly repository: AccountsRepository) {}

  // Sem paginação: são poucas contas (no máximo 5 bancos, decisão em docs/03-arquitetura.md).
  async overview(): Promise<AccountsOverview> {
    const accounts = await this.repository.findAll();
    return { accounts, totals: calculateAccountTotals(accounts) };
  }

  async setHidden(accountId: string, isHidden: boolean): Promise<AccountRecord> {
    const account = await this.repository.findById(accountId);
    if (!account) throw new NotFoundError(`Conta ${accountId} não encontrada`);
    if (account.type === 'cash') {
      throw new ValidationError(
        `A conta "${account.name}" não tem saldo e já fica fora dos totais; não dá para ocultá-la`,
        { details: [{ field: 'isHidden', message: 'Não se aplica à conta "Dinheiro"' }] },
      );
    }
    await this.repository.updateHidden(accountId, isHidden);
    return { ...account, isHidden };
  }

  /** Roda a cada subida da API, depois das migrations. Devolve `true` só se criou a conta agora. */
  ensureCashAccount(): Promise<boolean> {
    return this.repository.insertCashAccountIfMissing(CASH_ACCOUNT_NAME);
  }
}
