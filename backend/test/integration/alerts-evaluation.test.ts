import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { alerts, budgets, connections, transactions } from '../../src/db/schema.js';
import { type AlertsModule, createAlertsModule } from '../../src/modules/alerts/alerts.module.js';
import {
  insertAccountWith,
  insertCategory,
  insertConnection,
  transactionValues,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const NOVEMBER_FIRST_DAY = '2026-11-01';
const LIMIT_CENTS = 100_000;

const clock = { now: new Date('2026-11-15T13:00:00Z') };
const silentLogger = { error: () => undefined };

let database: ReturnType<typeof connectTestDatabase>;
let alertsModule: AlertsModule;
let accountId: string;
let categoryId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  clock.now = new Date('2026-11-15T13:00:00Z');
  alertsModule = createAlertsModule({ database, logger: silentLogger, now: () => clock.now });
  accountId = await insertAccountWith(database.db);
  categoryId = await insertCategory(database.db);
  await database.db
    .insert(budgets)
    .values({ categoryId, month: NOVEMBER_FIRST_DAY, limitCents: LIMIT_CENTS });
});

afterEach(async () => {
  await database.pool.end();
});

async function spend(amountCents: number): Promise<string> {
  const [row] = await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { categoryId, amountCents: -amountCents }))
    .returning({ id: transactions.id });
  if (!row) throw new Error('Teste: gasto não foi criado');
  return row.id;
}

async function allAlerts() {
  const rows = await database.db.select().from(alerts);
  return rows.map((row) => ({
    type: row.type,
    isResolved: row.resolvedAt !== null,
    isDismissed: row.dismissedAt !== null,
  }));
}

describe('alertas de orçamento', () => {
  it('should_create_no_alert_when_spent_is_799_99_of_1000', async () => {
    // Arrange
    await spend(79_999);
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual([]);
  });

  it('should_create_a_single_warning_when_evaluating_twice_at_exactly_eighty_percent', async () => {
    // Arrange
    await spend(80_000);
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'budget_warning', isResolved: false, isDismissed: false },
    ]);
  });

  it('should_resolve_the_warning_and_create_the_exceeded_alert_when_spent_passes_the_limit', async () => {
    // Arrange
    const transactionId = await spend(80_000);
    await alertsModule.evaluator.evaluateBudgets();
    await database.db
      .update(transactions)
      .set({ amountCents: -100_001 })
      .where(eq(transactions.id, transactionId));
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual(
      expect.arrayContaining([
        { type: 'budget_warning', isResolved: true, isDismissed: false },
        { type: 'budget_exceeded', isResolved: false, isDismissed: false },
      ]),
    );
  });

  it('should_resolve_the_alert_when_a_refund_brings_spent_below_eighty_percent', async () => {
    // Arrange
    await spend(80_000);
    await alertsModule.evaluator.evaluateBudgets();
    await database.db
      .insert(transactions)
      .values(transactionValues(accountId, { categoryId, amountCents: 10_000 }));
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'budget_warning', isResolved: true, isDismissed: false },
    ]);
  });

  it('should_resolve_the_alert_when_the_budget_limit_is_removed', async () => {
    // Arrange
    await spend(90_000);
    await alertsModule.evaluator.evaluateBudgets();
    await database.db.delete(budgets).where(eq(budgets.categoryId, categoryId));
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'budget_warning', isResolved: true, isDismissed: false },
    ]);
  });

  it('should_resolve_the_alert_when_the_month_has_ended', async () => {
    // Arrange
    await spend(90_000);
    await alertsModule.evaluator.evaluateBudgets();
    clock.now = new Date('2026-12-02T13:00:00Z');
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'budget_warning', isResolved: true, isDismissed: false },
    ]);
  });
});

describe('dispensar não recria o alerta', () => {
  it('should_not_create_another_alert_when_the_cause_continues_after_dismissing', async () => {
    // Arrange
    await spend(90_000);
    await alertsModule.evaluator.evaluateBudgets();
    await database.db.update(alerts).set({ dismissedAt: new Date() });
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'budget_warning', isResolved: false, isDismissed: true },
    ]);
  });

  it('should_create_a_new_alert_when_the_cause_ends_and_comes_back_after_dismissing', async () => {
    // Arrange
    const transactionId = await spend(90_000);
    await alertsModule.evaluator.evaluateBudgets();
    await database.db.update(alerts).set({ dismissedAt: new Date() });
    await database.db
      .update(transactions)
      .set({ amountCents: -1_000 })
      .where(eq(transactions.id, transactionId));
    await alertsModule.evaluator.evaluateBudgets();
    await database.db
      .update(transactions)
      .set({ amountCents: -90_000 })
      .where(eq(transactions.id, transactionId));
    // Act
    await alertsModule.evaluator.evaluateBudgets();
    // Assert
    expect(await allAlerts()).toEqual(
      expect.arrayContaining([
        { type: 'budget_warning', isResolved: true, isDismissed: true },
        { type: 'budget_warning', isResolved: false, isDismissed: false },
      ]),
    );
  });
});

describe('alertas de conexão', () => {
  it('should_create_a_single_alert_when_the_connection_keeps_failing', async () => {
    // Arrange
    await insertConnection(database.db, { status: 'error', statusDetail: 'Acesso a refazer.' });
    // Act
    await alertsModule.evaluator.evaluateConnections();
    await alertsModule.evaluator.evaluateConnections();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'connection_error', isResolved: false, isDismissed: false },
    ]);
  });

  it('should_create_an_alert_linked_to_the_connection_when_the_consent_expired', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { status: 'consent_expired' });
    // Act
    await alertsModule.evaluator.evaluateConnections();
    // Assert
    const [alert] = await database.db.select().from(alerts);
    expect(alert?.connectionId).toBe(connectionId);
  });

  it('should_resolve_the_alert_when_the_connection_is_ok_again', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { status: 'error' });
    await alertsModule.evaluator.evaluateConnections();
    await database.db
      .update(connections)
      .set({ status: 'ok', statusDetail: null })
      .where(eq(connections.id, connectionId));
    // Act
    await alertsModule.evaluator.evaluateConnections();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'connection_error', isResolved: true, isDismissed: false },
    ]);
  });

  it('should_create_a_new_alert_when_the_connection_recovers_and_fails_again', async () => {
    // Arrange
    const connectionId = await insertConnection(database.db, { status: 'error' });
    await alertsModule.evaluator.evaluateConnections();
    await database.db
      .update(connections)
      .set({ status: 'ok' })
      .where(eq(connections.id, connectionId));
    await alertsModule.evaluator.evaluateConnections();
    await database.db
      .update(connections)
      .set({ status: 'error' })
      .where(eq(connections.id, connectionId));
    // Act
    await alertsModule.evaluator.evaluateConnections();
    // Assert
    expect(await allAlerts()).toEqual(
      expect.arrayContaining([
        { type: 'connection_error', isResolved: true, isDismissed: false },
        { type: 'connection_error', isResolved: false, isDismissed: false },
      ]),
    );
  });

  it('should_not_touch_budget_alerts_when_evaluating_connections', async () => {
    // Arrange
    await spend(90_000);
    await alertsModule.evaluator.evaluateBudgets();
    // Act
    await alertsModule.evaluator.evaluateConnections();
    // Assert
    expect(await allAlerts()).toEqual([
      { type: 'budget_warning', isResolved: false, isDismissed: false },
    ]);
  });
});
