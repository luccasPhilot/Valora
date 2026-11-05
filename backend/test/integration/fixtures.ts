import type { Db } from '../../src/db/database.js';
import type { transactions } from '../../src/db/schema.js';
import { accounts, categories, connections } from '../../src/db/schema.js';

export async function insertAccount(db: Db): Promise<string> {
  const [connection] = await db
    .insert(connections)
    .values({ pluggyItemId: `item-${crypto.randomUUID()}`, institutionName: 'Banco de teste' })
    .returning({ id: connections.id });
  const [account] = await db
    .insert(accounts)
    .values({ connectionId: connection?.id, type: 'checking', name: 'Conta corrente' })
    .returning({ id: accounts.id });
  if (!account) throw new Error('Fixture: conta não foi criada');
  return account.id;
}

export async function insertConnection(
  db: Db,
  overrides: Partial<typeof connections.$inferInsert> = {},
): Promise<string> {
  const [connection] = await db
    .insert(connections)
    .values({
      pluggyItemId: `item-${crypto.randomUUID()}`,
      institutionName: 'Banco de teste',
      ...overrides,
    })
    .returning({ id: connections.id });
  if (!connection) throw new Error('Fixture: conexão não foi criada');
  return connection.id;
}

export async function insertAccountWith(
  db: Db,
  overrides: Partial<typeof accounts.$inferInsert> = {},
): Promise<string> {
  const [account] = await db
    .insert(accounts)
    .values({ type: 'checking', name: 'Conta corrente', ...overrides })
    .returning({ id: accounts.id });
  if (!account) throw new Error('Fixture: conta não foi criada');
  return account.id;
}

export async function insertCategory(db: Db): Promise<string> {
  const [category] = await db
    .insert(categories)
    .values({ name: `Categoria ${crypto.randomUUID()}`, kind: 'expense', icon: 'shopping-cart' })
    .returning({ id: categories.id });
  if (!category) throw new Error('Fixture: categoria não foi criada');
  return category.id;
}

export async function insertCategoryOfKind(
  db: Db,
  kind: 'expense' | 'income' | 'transfer',
  name: string,
): Promise<string> {
  const [category] = await db
    .insert(categories)
    .values({ name, kind, icon: 'wallet' })
    .returning({ id: categories.id });
  if (!category) throw new Error('Fixture: categoria não foi criada');
  return category.id;
}

type TransactionOverrides = Partial<typeof transactions.$inferInsert>;

export function transactionValues(
  accountId: string,
  overrides: TransactionOverrides = {},
): typeof transactions.$inferInsert {
  return {
    accountId,
    source: 'open_finance',
    date: '2026-11-03',
    description: 'Compra de teste',
    descriptionNormalized: 'COMPRA DE TESTE',
    amountCents: -8990,
    status: 'posted',
    ...overrides,
  };
}
