import { readFileSync } from 'node:fs';
import { z } from 'zod';

import { PluggyItemNotFoundError } from '../../src/modules/sync/pluggy-errors.js';
import type { PluggySdk } from '../../src/modules/sync/pluggy-sdk.js';
import type { TransactionWindow } from '../../src/modules/sync/sync.types.js';
import { toSaoPauloDate } from '../../src/shared/dates.js';

// Respostas reais do Pluggy, anonimizadas pelo `npm run fixtures:record`. Os testes nunca chamam o Pluggy.
const FIXTURE_FILES = ['item-1.json', 'item-2.json', 'item-3.json'] as const;
const FIXTURES_DIRECTORY = new URL('../fixtures/pluggy/', import.meta.url);

const fixtureSchema = z.object({
  recordedAt: z.string(),
  item: z.looseObject({ id: z.string(), status: z.string() }),
  accounts: z.array(z.looseObject({ id: z.string(), itemId: z.string(), type: z.string() })),
  transactions: z.array(
    z.looseObject({
      id: z.string(),
      accountId: z.string(),
      date: z.string(),
      status: z.string().nullable(),
      type: z.string(),
      // Opcional só para os testes poderem tirá-lo e simular uma resposta inválida.
      amount: z.number().optional(),
      category: z.string().nullable(),
    }),
  ),
  investments: z.array(z.looseObject({ id: z.string(), itemId: z.string(), balance: z.number() })),
  // Faturas dos cartões. Fixtures gravadas antes das faturas não têm este campo.
  bills: z.array(z.looseObject({ id: z.string(), accountId: z.string() })).default([]),
});

export type PluggyItemFixture = z.infer<typeof fixtureSchema>;
export type PluggyBillFixture = PluggyItemFixture['bills'][number];
export type PluggyTransactionFixture = PluggyItemFixture['transactions'][number];

interface BillFixtureOptions {
  readonly id: string;
  readonly accountId: string;
  /** AAAA-MM-DD */
  readonly dueDate: string;
  /** Hora UTC que o Pluggy manda junto da data. O MeuPluggy manda meia-noite. */
  readonly dueTime?: string;
  readonly totalAmount: number;
  readonly paidAmounts?: readonly number[];
}

/** Fatura sintética no formato do Pluggy (valores em reais, datas ISO), para os testes. */
export function buildBillFixture(options: BillFixtureOptions): PluggyBillFixture {
  return {
    id: options.id,
    accountId: options.accountId,
    dueDate: `${options.dueDate}T${options.dueTime ?? '00:00:00'}.000Z`,
    billClosingDate: null,
    totalAmount: options.totalAmount,
    minimumPaymentAmount: null,
    payments: (options.paidAmounts ?? []).map((amount, index) => ({
      id: `${options.id}-pay-${String(index + 1)}`,
      amount,
    })),
  };
}

/** Cópias novas a cada chamada: cada teste pode alterar as suas à vontade. */
export function loadPluggyFixtures(): PluggyItemFixture[] {
  return FIXTURE_FILES.map((fileName) =>
    fixtureSchema.parse(JSON.parse(readFileSync(new URL(fileName, FIXTURES_DIRECTORY), 'utf8'))),
  );
}

/** O "agora" das fixtures: o momento em que foram gravadas. */
export function fixturesRecordedAt(fixtures: readonly PluggyItemFixture[]): Date {
  const [first] = fixtures;
  if (!first) throw new Error('Fixture: nenhum item carregado');
  return new Date(first.recordedAt);
}

export class FixtureNotFoundError extends Error {
  constructor(itemId: string) {
    super(`Item ${itemId} não existe nas fixtures`);
    this.name = 'FixtureNotFoundError';
  }
}

/** Pluggy de mentira, servido pelas fixtures. Filtra as transações pela janela, como a API real. */
export class FakePluggySdk implements PluggySdk {
  private pendingFetchItem: Promise<void> = Promise.resolve();
  private readonly removedItemIds = new Set<string>();
  /** Janelas pedidas em `fetchAllTransactions`, na ordem. */
  readonly requestedWindows: TransactionWindow[] = [];

  constructor(readonly fixtures: PluggyItemFixture[]) {}

  get itemIds(): string[] {
    return this.fixtures.map((fixture) => fixture.item.id);
  }

  /** Segura o próximo `fetchItem` até a função devolvida ser chamada. */
  holdFetchItem(): () => void {
    let release: () => void = () => undefined;
    this.pendingFetchItem = new Promise((resolve) => {
      release = resolve;
    });
    return release;
  }

  /** Simula o banco removido do Meu Pluggy: as chamadas por item passam a falhar como o SDK real. */
  removeItem(itemId: string): void {
    this.removedItemIds.add(itemId);
  }

  /** O banco volta a existir no Meu Pluggy. */
  restoreItem(itemId: string): void {
    this.removedItemIds.delete(itemId);
  }

  async fetchItem(itemId: string): Promise<unknown> {
    await this.pendingFetchItem;
    this.throwIfRemoved(itemId);
    return this.fixtureOf(itemId).item;
  }

  async fetchAccounts(itemId: string): Promise<unknown> {
    this.throwIfRemoved(itemId);
    const accounts = this.fixtureOf(itemId).accounts;
    return { results: accounts, page: 1, total: accounts.length, totalPages: 1 };
  }

  async fetchAllTransactions(accountId: string, window: TransactionWindow): Promise<unknown> {
    this.requestedWindows.push(window);
    return this.fixtures
      .flatMap((fixture) => fixture.transactions)
      .filter((transaction) => transaction.accountId === accountId)
      .filter((transaction) => {
        const day = toSaoPauloDate(new Date(transaction.date));
        return day >= window.from && day <= window.to;
      });
  }

  async fetchInvestmentsPage(itemId: string, page: number): Promise<unknown> {
    this.throwIfRemoved(itemId);
    const investments = page === 1 ? this.fixtureOf(itemId).investments : [];
    return { results: investments, page, total: investments.length, totalPages: 1 };
  }

  async fetchCreditCardBillsPage(accountId: string, page: number): Promise<unknown> {
    const bills = this.fixtures
      .flatMap((fixture) => fixture.bills)
      .filter((bill) => bill.accountId === accountId);
    const results = page === 1 ? bills : [];
    return { results, page, total: bills.length, totalPages: 1 };
  }

  private throwIfRemoved(itemId: string): void {
    if (this.removedItemIds.has(itemId)) throw new PluggyItemNotFoundError();
  }

  private fixtureOf(itemId: string): PluggyItemFixture {
    const fixture = this.fixtures.find((candidate) => candidate.item.id === itemId);
    if (!fixture) throw new FixtureNotFoundError(itemId);
    return fixture;
  }
}
