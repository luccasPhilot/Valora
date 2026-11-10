import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  alerts,
  balanceSnapshots,
  connections,
  creditCardBills,
  transactions,
} from '../../src/db/schema.js';
import { createAlertsModule } from '../../src/modules/alerts/alerts.module.js';
import { buildTestApp, type TestApp } from '../helpers/test-app.js';
import {
  insertAccountWith,
  insertCategoryOfKind,
  insertConnection,
  transactionValues,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

// 10h em São Paulo, 15 de novembro de 2026.
const NOW = new Date('2026-11-15T13:00:00Z');
// O banco B é arquivado no dia 10 de novembro, em São Paulo.
const ARCHIVED_AT = new Date('2026-11-10T15:00:00Z');
const SILENT_LOGGER = { error: () => undefined };

let testApp: TestApp;
let database: ReturnType<typeof connectTestDatabase>;

interface Bank {
  readonly connectionId: string;
  readonly checkingId: string;
  readonly cardId: string;
}

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  testApp = buildTestApp(database, { now: () => NOW });
});

afterEach(async () => {
  await testApp.app.close();
});

async function getJson(url: string) {
  const response = await testApp.app.inject({ method: 'GET', url });
  return response.json();
}

async function patchArchived(connectionId: string, isArchived: boolean) {
  await testApp.app.inject({
    method: 'PATCH',
    url: `/api/v1/connections/${connectionId}`,
    payload: { isArchived },
  });
}

async function createBank(options: {
  pluggyItemId: string;
  name: string;
  checkingCents: number;
  cardBillCents?: number;
  connectionOverrides?: Partial<typeof connections.$inferInsert>;
}): Promise<Bank> {
  const connectionId = await insertConnection(database.db, {
    pluggyItemId: options.pluggyItemId,
    institutionName: options.name,
    ...options.connectionOverrides,
  });
  const checkingId = await insertAccountWith(database.db, {
    connectionId,
    type: 'checking',
    name: `${options.name} corrente`,
    balanceCents: options.checkingCents,
  });
  const cardId = await insertAccountWith(database.db, {
    connectionId,
    type: 'credit_card',
    name: `${options.name} cartão`,
    balanceCents: options.cardBillCents ?? 0,
  });
  return { connectionId, checkingId, cardId };
}

async function insertSnapshot(accountId: string, date: string, balanceCents: number) {
  await database.db.insert(balanceSnapshots).values({ accountId, date, balanceCents });
}

// Banco A (ativo): R$ 4.850,32. Banco B (arquivado no dia 10): R$ 1.000,00 e um cartão com fatura.
async function twoBanksWithBArchived() {
  const active = await createBank({
    pluggyItemId: 'item-1',
    name: 'Banco A',
    checkingCents: 485032,
  });
  const archived = await createBank({
    pluggyItemId: 'item-2',
    name: 'Banco B',
    checkingCents: 100000,
    cardBillCents: 90000,
  });
  await database.db
    .update(connections)
    .set({ archivedAt: ARCHIVED_AT })
    .where(eq(connections.id, archived.connectionId));
  return { active, archived };
}

describe('contas e totais', () => {
  it('should_leave_the_accounts_of_an_archived_bank_out_of_the_list', async () => {
    // Arrange
    await twoBanksWithBArchived();
    // Act
    const body = await getJson('/api/v1/accounts');
    // Assert
    expect(body.items.map((account: { name: string }) => account.name)).toEqual([
      'Banco A cartão',
      'Banco A corrente',
    ]);
  });

  it('should_leave_the_archived_bank_out_of_the_total_balance', async () => {
    // Arrange
    await twoBanksWithBArchived();
    // Act
    const body = await getJson('/api/v1/accounts');
    // Assert
    expect(body.totals.totalBalanceCents).toBe(485032);
  });

  it('should_leave_the_archived_card_out_of_the_open_bills_total', async () => {
    // Arrange
    await twoBanksWithBArchived();
    // Act
    const body = await getJson('/api/v1/accounts');
    // Assert
    expect(body.totals.openCreditCardBillsCents).toBe(0);
  });

  it('should_bring_everything_back_when_the_bank_is_reactivated', async () => {
    // Arrange
    const { archived } = await twoBanksWithBArchived();
    // Act
    await patchArchived(archived.connectionId, false);
    // Assert
    const body = await getJson('/api/v1/accounts');
    expect({ total: body.totals.totalBalanceCents, accounts: body.items.length }).toEqual({
      total: 585032,
      accounts: 4,
    });
  });

  it('should_not_accept_a_manual_transaction_in_an_account_of_an_archived_bank', async () => {
    // Arrange
    const { archived } = await twoBanksWithBArchived();
    const categoryId = await insertCategoryOfKind(database.db, 'expense', 'Mercado');
    // Act
    const response = await testApp.app.inject({
      method: 'POST',
      url: '/api/v1/transactions',
      payload: {
        type: 'expense',
        amountCents: 1000,
        description: 'Teste',
        date: '2026-11-12',
        categoryId,
        accountId: archived.checkingId,
      },
    });
    // Assert
    expect(response.statusCode).toBe(400);
  });
});

describe('banco removido do Meu Pluggy e ainda ativo', () => {
  it('should_still_list_the_accounts_of_a_bank_with_the_item_not_found_status', async () => {
    // Arrange
    await createBank({
      pluggyItemId: 'item-1',
      name: 'Banco A',
      checkingCents: 1000,
      connectionOverrides: { status: 'item_not_found', statusDetail: 'Removido' },
    });
    // Act
    const body = await getJson('/api/v1/accounts');
    // Assert
    expect(body.items[0].connection.status).toBe('item_not_found');
  });
});

describe('faturas e projeção', () => {
  it('should_leave_the_card_of_an_archived_bank_out_of_the_bills', async () => {
    // Arrange
    const { archived } = await twoBanksWithBArchived();
    await database.db.insert(creditCardBills).values({
      accountId: archived.cardId,
      pluggyBillId: 'bill-archived',
      dueDate: '2026-11-25',
      totalCents: 90000,
    });
    // Act
    const body = await getJson('/api/v1/credit-card-bills');
    // Assert
    expect(body.items.map((card: { accountName: string }) => card.accountName)).toEqual([
      'Banco A cartão',
    ]);
  });

  it('should_not_count_the_bill_of_an_archived_card_in_the_projection', async () => {
    // Arrange
    const { archived } = await twoBanksWithBArchived();
    await database.db.insert(creditCardBills).values({
      accountId: archived.cardId,
      pluggyBillId: 'bill-archived',
      dueDate: '2026-11-25',
      totalCents: 90000,
    });
    // Act
    const body = await getJson('/api/v1/projection');
    // Assert
    expect(body.billsDueCents).toBe(0);
  });
});

describe('histórico', () => {
  it('should_keep_the_transactions_of_an_archived_bank_in_the_transactions_list', async () => {
    // Arrange
    const { archived } = await twoBanksWithBArchived();
    await database.db
      .insert(transactions)
      .values(transactionValues(archived.checkingId, { date: '2026-11-03', amountCents: -30000 }));
    // Act
    const body = await getJson('/api/v1/transactions?from=2026-11-01&to=2026-11-30');
    // Assert
    expect(body.items.map((item: { account: { name: string } }) => item.account.name)).toEqual([
      'Banco B corrente',
    ]);
  });

  it('should_keep_counting_the_archived_expenses_in_past_and_current_months', async () => {
    // Arrange
    const { archived } = await twoBanksWithBArchived();
    await database.db
      .insert(transactions)
      .values(transactionValues(archived.checkingId, { date: '2026-10-15', amountCents: -30000 }));
    await database.db
      .insert(transactions)
      .values(transactionValues(archived.checkingId, { date: '2026-11-03', amountCents: -20000 }));
    // Act
    const body = await getJson('/api/v1/dashboard?month=2026-11');
    // Assert
    expect(
      body.incomeVsExpense
        .filter((month: { month: string }) => ['2026-10', '2026-11'].includes(month.month))
        .map((month: { expenseCents: number }) => month.expenseCents),
    ).toEqual([30000, 20000]);
  });
});

describe('evolução do saldo', () => {
  async function seedSnapshots() {
    const { active, archived } = await twoBanksWithBArchived();
    await insertSnapshot(active.checkingId, '2026-11-01', 400000);
    await insertSnapshot(active.checkingId, '2026-11-05', 450000);
    await insertSnapshot(active.checkingId, '2026-11-12', 480000);
    await insertSnapshot(archived.checkingId, '2026-11-01', 100000);
    await insertSnapshot(archived.checkingId, '2026-11-05', 100000);
    await insertSnapshot(archived.checkingId, '2026-11-12', 100000);
    return { active, archived };
  }

  it('should_sum_the_archived_bank_only_on_the_days_before_it_was_archived', async () => {
    // Arrange
    await seedSnapshots();
    // Act
    const body = await getJson('/api/v1/dashboard?month=2026-11');
    // Assert
    expect(body.balanceEvolution).toEqual([
      { date: '2026-11-01', balanceCents: 500000 },
      { date: '2026-11-05', balanceCents: 550000 },
      { date: '2026-11-12', balanceCents: 480000 },
    ]);
  });

  it('should_not_sum_the_archived_bank_on_the_day_it_was_archived', async () => {
    // Arrange
    const { archived } = await seedSnapshots();
    await insertSnapshot(archived.checkingId, '2026-11-10', 100000);
    // Act
    const body = await getJson('/api/v1/dashboard?month=2026-11');
    // Assert
    expect(body.balanceEvolution.map((point: { date: string }) => point.date)).not.toContain(
      '2026-11-10',
    );
  });

  it('should_calculate_the_month_change_without_the_archived_bank', async () => {
    // Arrange
    await seedSnapshots();
    // Act
    const body = await getJson('/api/v1/dashboard?month=2026-11');
    // Assert
    expect(body.balanceChange.cents).toBe(85032);
  });

  it('should_not_sum_hidden_or_card_accounts_of_the_archived_bank_in_the_past', async () => {
    // Arrange
    const { archived } = await seedSnapshots();
    await insertSnapshot(archived.cardId, '2026-11-01', 90000);
    // Act
    const body = await getJson('/api/v1/dashboard?month=2026-11');
    // Assert
    expect(body.balanceEvolution[0]).toEqual({ date: '2026-11-01', balanceCents: 500000 });
  });
});

describe('alertas de conexão', () => {
  async function alertStates() {
    const rows = await database.db.select().from(alerts);
    return rows.map((row) => ({ type: row.type, isResolved: row.resolvedAt !== null }));
  }

  it('should_resolve_the_connection_alert_right_away_when_the_bank_is_archived', async () => {
    // Arrange
    const bank = await createBank({
      pluggyItemId: 'item-1',
      name: 'Banco A',
      checkingCents: 1000,
      connectionOverrides: { status: 'error', statusDetail: 'Falha antiga' },
    });
    const alertsModule = createAlertsModule({
      database,
      logger: SILENT_LOGGER,
      now: () => NOW,
    });
    await alertsModule.evaluator.evaluateConnections();
    // Act
    await patchArchived(bank.connectionId, true);
    // Assert
    expect(await alertStates()).toEqual([{ type: 'connection_error', isResolved: true }]);
  });

  it('should_not_bring_the_alert_back_while_the_bank_is_archived', async () => {
    // Arrange
    const bank = await createBank({
      pluggyItemId: 'item-1',
      name: 'Banco A',
      checkingCents: 1000,
      connectionOverrides: { status: 'item_not_found', statusDetail: 'Removido' },
    });
    await patchArchived(bank.connectionId, true);
    const alertsModule = createAlertsModule({
      database,
      logger: SILENT_LOGGER,
      now: () => NOW,
    });
    // Act
    await alertsModule.evaluator.evaluateAll();
    // Assert
    expect(await alertStates()).toEqual([]);
  });

  it('should_create_the_alert_for_a_bank_removed_from_meu_pluggy', async () => {
    // Arrange
    await createBank({
      pluggyItemId: 'item-1',
      name: 'Banco A',
      checkingCents: 1000,
      connectionOverrides: { status: 'item_not_found', statusDetail: 'Removido' },
    });
    const alertsModule = createAlertsModule({
      database,
      logger: SILENT_LOGGER,
      now: () => NOW,
    });
    // Act
    await alertsModule.evaluator.evaluateConnections();
    // Assert
    expect(await alertStates()).toEqual([{ type: 'connection_error', isResolved: false }]);
  });
});

describe('o caso real: banco fora do PLUGGY_ITEM_IDS e parado em erro', () => {
  it('should_flag_the_bank_as_not_configured_then_drop_it_from_the_lists_when_archived', async () => {
    // Arrange
    const orphan = await createBank({
      pluggyItemId: 'item-tirado-do-env',
      name: 'Conta Corrente',
      checkingCents: 250000,
      connectionOverrides: {
        status: 'error',
        statusDetail: 'Não foi possível consultar este banco no Pluggy.',
        lastSyncedAt: new Date('2026-11-06T10:00:00Z'),
      },
    });
    const before = await getJson('/api/v1/connections');
    // Act
    await patchArchived(orphan.connectionId, true);
    // Assert
    const after = await getJson('/api/v1/connections');
    const archived = await getJson('/api/v1/connections?archived=true');
    expect({
      wasNotConfigured: before.items[0].isConfigured === false,
      activeAfter: after.items.length,
      archivedAfter: archived.items.length,
      totalBalance: (await getJson('/api/v1/accounts')).totals.totalBalanceCents,
    }).toEqual({ wasNotConfigured: true, activeAfter: 0, archivedAfter: 1, totalBalance: 0 });
  });
});
