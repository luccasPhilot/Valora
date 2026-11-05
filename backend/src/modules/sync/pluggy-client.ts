import type { z } from 'zod';

import { toSaoPauloDate } from '../../shared/dates.js';
import { normalizeDescription } from '../../shared/text.js';
import { type ItemConnectionState, mapItemStatus } from './item-status.js';
import {
  type PluggyAccount,
  pluggyAccountSchema,
  type PluggyInvestment,
  pluggyInvestmentSchema,
  pluggyItemSchema,
  pluggyListSchema,
  pluggyPageSchema,
  type PluggyTransaction,
  pluggyTransactionSchema,
} from './pluggy.schemas.js';
import { normalizeAmount, toAccountType, toCents, toLastDigits } from './pluggy-normalization.js';
import type { PluggySdk } from './pluggy-sdk.js';
import type {
  SyncedAccount,
  SyncedInvestment,
  SyncedTransaction,
  TransactionWindow,
} from './sync.types.js';

// O conector MeuPluggy é igual para todos os bancos: nome e logo dele não identificam a instituição.
const MEU_PLUGGY_CONNECTOR_ID = 200;
const MAX_INVESTMENT_PAGES = 100;

export class PluggyResponseError extends Error {
  // Só os caminhos dos campos: a resposta tem valores e descrições.
  constructor(resource: string, issuePaths: readonly string[]) {
    super(`Resposta inválida do Pluggy em ${resource} (campos: ${issuePaths.join(', ')})`);
    this.name = 'PluggyResponseError';
  }
}

export interface PluggyItemOverview {
  readonly connection: ItemConnectionState;
  readonly connectorName: string;
  readonly institutionLogoUrl: string | null;
}

export interface PluggyAccountList {
  /** Nome da primeira conta do tipo BANK, que no MeuPluggy é o nome do banco. */
  readonly institutionName: string | null;
  readonly accounts: readonly SyncedAccount[];
}

function parseOrThrow<T>(schema: z.ZodType<T>, payload: unknown, resource: string): T {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  const issuePaths = parsed.error.issues.map((issue) => issue.path.join('.') || '(raiz)');
  throw new PluggyResponseError(resource, [...new Set(issuePaths)]);
}

function toSyncedAccount(account: PluggyAccount, raw: unknown): SyncedAccount {
  const optionalCents = (amount: number | null | undefined) =>
    amount === null || amount === undefined ? null : toCents(amount);
  return {
    pluggyAccountId: account.id,
    type: toAccountType(account.type, account.subtype),
    name: (account.marketingName ?? account.name).trim(),
    numberLastDigits: toLastDigits(account.number),
    balanceCents: toCents(account.balance),
    creditLimitCents: optionalCents(account.creditData?.creditLimit),
    availableLimitCents: optionalCents(account.creditData?.availableCreditLimit),
    raw,
  };
}

function toSyncedTransaction(transaction: PluggyTransaction, raw: unknown): SyncedTransaction {
  const amountInReais = transaction.amountInAccountCurrency ?? transaction.amount;
  return {
    pluggyTransactionId: transaction.id,
    date: toSaoPauloDate(transaction.date),
    description: transaction.description,
    descriptionNormalized: normalizeDescription(transaction.description),
    amountCents: normalizeAmount(amountInReais, transaction.type),
    status: transaction.status === 'PENDING' ? 'pending' : 'posted',
    pluggyCategory: transaction.category ?? null,
    installmentNumber: transaction.creditCardMetadata?.installmentNumber ?? null,
    installmentTotal: transaction.creditCardMetadata?.totalInstallments ?? null,
    raw,
  };
}

function toSyncedInvestment(investment: PluggyInvestment, raw: unknown): SyncedInvestment {
  return {
    pluggyInvestmentId: investment.id,
    name: investment.name.trim(),
    type: investment.type,
    balanceCents: toCents(investment.balance),
    raw,
  };
}

/** Único ponto de contato com o Pluggy. Valida as respostas e devolve tipos do Valora. */
export class PluggyClient {
  constructor(
    private readonly sdk: PluggySdk,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getItem(itemId: string): Promise<PluggyItemOverview> {
    const item = parseOrThrow(pluggyItemSchema, await this.sdk.fetchItem(itemId), 'item');
    const isMeuPluggy = item.connector.id === MEU_PLUGGY_CONNECTOR_ID;
    const connection = mapItemStatus(
      {
        status: item.status,
        errorCode: item.error?.code ?? null,
        consentExpiresAt: item.consentExpiresAt ?? null,
      },
      this.now(),
    );
    return {
      connection,
      connectorName: item.connector.name,
      institutionLogoUrl: isMeuPluggy ? null : (item.connector.imageUrl ?? null),
    };
  }

  async listAccounts(itemId: string): Promise<PluggyAccountList> {
    const page = parseOrThrow(pluggyPageSchema, await this.sdk.fetchAccounts(itemId), 'contas');
    const accounts = page.results.map((raw) => ({
      raw,
      account: parseOrThrow(pluggyAccountSchema, raw, 'contas'),
    }));
    const bankAccount = accounts.find(({ account }) => account.type === 'BANK');
    return {
      institutionName: bankAccount ? bankAccount.account.name.trim() || null : null,
      accounts: accounts.map(({ account, raw }) => toSyncedAccount(account, raw)),
    };
  }

  async listTransactions(
    pluggyAccountId: string,
    window: TransactionWindow,
  ): Promise<SyncedTransaction[]> {
    const response = await this.sdk.fetchAllTransactions(pluggyAccountId, window);
    const rawTransactions = parseOrThrow(pluggyListSchema, response, 'transações');
    return rawTransactions.map((raw) =>
      toSyncedTransaction(parseOrThrow(pluggyTransactionSchema, raw, 'transações'), raw),
    );
  }

  async listInvestments(itemId: string): Promise<SyncedInvestment[]> {
    const investments: SyncedInvestment[] = [];
    for (let pageNumber = 1; pageNumber <= MAX_INVESTMENT_PAGES; pageNumber += 1) {
      const response = await this.sdk.fetchInvestmentsPage(itemId, pageNumber);
      const page = parseOrThrow(pluggyPageSchema, response, 'investimentos');
      for (const raw of page.results) {
        const investment = parseOrThrow(pluggyInvestmentSchema, raw, 'investimentos');
        investments.push(toSyncedInvestment(investment, raw));
      }
      if (pageNumber >= (page.totalPages ?? pageNumber)) break;
    }
    return investments;
  }
}
