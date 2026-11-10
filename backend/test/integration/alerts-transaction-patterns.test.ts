import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { alerts, transactions } from '../../src/db/schema.js';
import { type AlertsModule, createAlertsModule } from '../../src/modules/alerts/alerts.module.js';
import { buildTestApp } from '../helpers/test-app.js';
import { insertAccountWith, insertCategoryOfKind, transactionValues } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const clock = { now: new Date('2026-11-15T13:00:00Z') };
const silentLogger = { error: () => undefined };

let database: ReturnType<typeof connectTestDatabase>;
let alertsModule: AlertsModule;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  clock.now = new Date('2026-11-15T13:00:00Z');
  alertsModule = createAlertsModule({ database, logger: silentLogger, now: () => clock.now });
  accountId = await insertAccountWith(database.db);
});

afterEach(async () => {
  await database.pool.end();
});

async function charge(
  date: string,
  overrides: Partial<typeof transactions.$inferInsert> = {},
): Promise<string> {
  const [row] = await database.db
    .insert(transactions)
    .values(
      transactionValues(accountId, {
        date,
        description: 'Loja Exemplo',
        descriptionNormalized: 'LOJA EXEMPLO',
        amountCents: -8990,
        pluggyCategory: 'Shopping',
        ...overrides,
      }),
    )
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: cobrança não foi criada');
  return row.id;
}

async function monthlyCharges(dates: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const date of dates) {
    ids.push(
      await charge(date, {
        description: 'Streaming Exemplo',
        descriptionNormalized: 'STREAMING EXEMPLO',
        amountCents: -3990,
      }),
    );
  }
  return ids;
}

async function storedAlerts() {
  const rows = await database.db.select().from(alerts);
  return rows.map((row) => ({
    type: row.type,
    message: row.message,
    transactionId: row.transactionId,
    isResolved: row.resolvedAt !== null,
    isDismissed: row.dismissedAt !== null,
  }));
}

describe('cobrança duplicada', () => {
  it('should_create_a_single_alert_linked_to_a_transaction_when_evaluating_twice', async () => {
    // Arrange
    await charge('2026-11-14');
    await charge('2026-11-14');
    // Act
    await alertsModule.evaluator.evaluateAll();
    await alertsModule.evaluator.evaluateAll();
    // Assert
    const duplicates = (await storedAlerts()).filter((alert) => alert.type === 'duplicate_charge');
    expect(duplicates).toHaveLength(1);
  });

  it('should_create_the_alert_with_a_message_that_has_no_amounts', async () => {
    // Arrange
    await charge('2026-11-14');
    await charge('2026-11-14');
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([
      expect.objectContaining({ message: 'Possível cobrança duplicada: Loja Exemplo' }),
    ]);
  });

  it('should_not_bring_the_alert_back_when_it_was_dismissed', async () => {
    // Arrange
    await charge('2026-11-14');
    await charge('2026-11-14');
    await alertsModule.evaluator.evaluateTransactionPatterns();
    await database.db.update(alerts).set({ dismissedAt: new Date() });
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([
      expect.objectContaining({ isDismissed: true, isResolved: false }),
    ]);
  });

  it('should_keep_the_alert_active_when_the_charge_is_more_than_seven_days_old', async () => {
    // Arrange
    await charge('2026-11-14');
    await charge('2026-11-14');
    await alertsModule.evaluator.evaluateTransactionPatterns();
    clock.now = new Date('2026-11-30T13:00:00Z');
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([
      expect.objectContaining({ isDismissed: false, isResolved: false }),
    ]);
  });

  it('should_not_create_an_alert_when_the_duplicates_are_in_a_transfer_category', async () => {
    // Arrange
    const transferCategoryId = await insertCategoryOfKind(
      database.db,
      'transfer',
      'Pagamento de fatura',
    );
    await charge('2026-11-14', { categoryId: transferCategoryId });
    await charge('2026-11-14', { categoryId: transferCategoryId });
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([]);
  });
});

describe('assinatura detectada', () => {
  it('should_create_a_single_alert_when_three_monthly_charges_exist_and_it_evaluates_twice', async () => {
    // Arrange
    await monthlyCharges(['2026-08-05', '2026-09-04', '2026-10-05']);
    // Act
    await alertsModule.evaluator.evaluateAll();
    await alertsModule.evaluator.evaluateAll();
    // Assert
    expect(await storedAlerts()).toEqual([
      expect.objectContaining({
        type: 'subscription_detected',
        message: 'Assinatura detectada: Streaming Exemplo',
      }),
    ]);
  });

  it('should_link_the_alert_to_the_most_recent_charge', async () => {
    // Arrange
    const ids = await monthlyCharges(['2026-08-05', '2026-09-04', '2026-10-05']);
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([expect.objectContaining({ transactionId: ids[2] })]);
  });

  it('should_not_create_an_alert_when_the_subscription_ended_months_ago', async () => {
    // Arrange
    await monthlyCharges(['2026-05-01', '2026-05-31', '2026-07-01']);
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([]);
  });

  it('should_not_create_another_alert_when_the_next_charge_arrives', async () => {
    // Arrange
    await monthlyCharges(['2026-08-05', '2026-09-04', '2026-10-05']);
    await alertsModule.evaluator.evaluateTransactionPatterns();
    await monthlyCharges(['2026-11-05']);
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toHaveLength(1);
  });

  it('should_not_bring_the_alert_back_when_it_was_dismissed_and_the_next_charge_arrives', async () => {
    // Arrange
    await monthlyCharges(['2026-08-05', '2026-09-04', '2026-10-05']);
    await alertsModule.evaluator.evaluateTransactionPatterns();
    await database.db.update(alerts).set({ dismissedAt: new Date() });
    await monthlyCharges(['2026-11-05']);
    // Act
    await alertsModule.evaluator.evaluateTransactionPatterns();
    // Assert
    expect(await storedAlerts()).toEqual([expect.objectContaining({ isDismissed: true })]);
  });
});

describe('GET /alerts', () => {
  it('should_return_the_transactions_target_with_the_day_and_description_of_the_charge', async () => {
    // Arrange
    await charge('2026-11-14');
    await charge('2026-11-14');
    await alertsModule.evaluator.evaluateTransactionPatterns();
    const testApp = buildTestApp(database, { now: () => clock.now });
    // Act
    const response = await testApp.app.inject({ method: 'GET', url: '/api/v1/alerts' });
    // Assert
    expect(response.json().items[0].target).toEqual({
      screen: 'transactions',
      from: '2026-11-14',
      to: '2026-11-14',
      search: 'LOJA EXEMPLO',
    });
  });
});
