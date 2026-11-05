import { readFileSync } from 'node:fs';
import { z } from 'zod';

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
});

export type PluggyItemFixture = z.infer<typeof fixtureSchema>;
export type PluggyTransactionFixture = PluggyItemFixture['transactions'][number];

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

export class PluggyItemNotFoundError extends Error {
  constructor(itemId: string) {
    super(`Item ${itemId} não existe nas fixtures`);
    this.name = 'PluggyItemNotFoundError';
  }
}

/** Pluggy de mentira, servido pelas fixtures. Filtra as transações pela janela, como a API real. */
export class FakePluggySdk implements PluggySdk {
  private pendingFetchItem: Promise<void> = Promise.resolve();
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

  async fetchItem(itemId: string): Promise<unknown> {
    await this.pendingFetchItem;
    return this.fixtureOf(itemId).item;
  }

  async fetchAccounts(itemId: string): Promise<unknown> {
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
    const investments = page === 1 ? this.fixtureOf(itemId).investments : [];
    return { results: investments, page, total: investments.length, totalPages: 1 };
  }

  private fixtureOf(itemId: string): PluggyItemFixture {
    const fixture = this.fixtures.find((candidate) => candidate.item.id === itemId);
    if (!fixture) throw new PluggyItemNotFoundError(itemId);
    return fixture;
  }
}
