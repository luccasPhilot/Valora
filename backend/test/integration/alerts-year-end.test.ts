import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { alerts } from '../../src/db/schema.js';
import { AlertChargesRepository } from '../../src/modules/alerts/alert-charges.repository.js';
import { AlertEvaluator } from '../../src/modules/alerts/alert-evaluator.js';
import { type AlertsModule, createAlertsModule } from '../../src/modules/alerts/alerts.module.js';
import { AlertsRepository } from '../../src/modules/alerts/alerts.repository.js';
import { BudgetsRepository } from '../../src/modules/budgets/budgets.repository.js';
import { ConnectionsRepository } from '../../src/modules/connections/connections.repository.js';
import { insertAccountSnapshot, insertAccountWith, insertConnection } from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const YEAR_END = '2026-12-31';
const BALANCE_CENTS = 150_000;
// Data fixa: com o `now()` padrão, os testes mudariam de resultado depois de 31/12/2026.
const CREATED_BEFORE_YEAR_END = new Date('2026-06-01T12:00:00Z');
// 10h em São Paulo de cada dia.
const DECEMBER_30 = new Date('2026-12-30T13:00:00Z');
const DECEMBER_31 = new Date('2026-12-31T13:00:00Z');
const JANUARY_1 = new Date('2027-01-01T13:00:00Z');
const JANUARY_2 = new Date('2027-01-02T13:00:00Z');
const JANUARY_3 = new Date('2027-01-03T13:00:00Z');
const FEBRUARY_1 = new Date('2027-02-01T13:00:00Z');

const clock = { now: DECEMBER_31 };
const silentLogger = { error: () => undefined };

let database: ReturnType<typeof connectTestDatabase>;
let alertsModule: AlertsModule;
let connectionId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  clock.now = DECEMBER_31;
  alertsModule = createAlertsModule({ database, logger: silentLogger, now: () => clock.now });
  connectionId = await insertConnection(database.db);
});

afterEach(async () => {
  await database.pool.end();
});

function insertBankAccount(): Promise<string> {
  return insertAccountWith(database.db, { connectionId, createdAt: CREATED_BEFORE_YEAR_END });
}

async function evaluateOn(day: Date): Promise<void> {
  clock.now = day;
  await alertsModule.evaluator.evaluateAll();
}

async function allAlerts() {
  const rows = await database.db.select().from(alerts).orderBy(alerts.createdAt);
  return rows.map((row) => ({
    type: row.type,
    isResolved: row.resolvedAt !== null,
    message: row.message,
  }));
}

describe('foto de 31/12', () => {
  it('should_create_pending_alert_when_a_bank_has_no_snapshot_on_december_31', async () => {
    // Arrange
    await insertBankAccount();
    await insertBankAccount();
    // Act
    await evaluateOn(DECEMBER_31);
    // Assert
    expect(await allAlerts()).toEqual([
      {
        type: 'year_end_snapshot_pending',
        isResolved: false,
        message:
          'Ainda falta a foto de 31/12 de 2 contas. Sincronize hoje: ela é a base dos bens e direitos no IR.',
      },
    ]);
  });

  it('should_resolve_pending_alert_when_snapshots_are_completed_on_december_31', async () => {
    // Arrange
    const accountId = await insertBankAccount();
    await evaluateOn(DECEMBER_31);
    await insertAccountSnapshot(database.db, accountId, YEAR_END, BALANCE_CENTS);
    // Act
    await evaluateOn(DECEMBER_31);
    // Assert
    expect((await allAlerts()).map(({ type, isResolved }) => ({ type, isResolved }))).toEqual([
      { type: 'year_end_snapshot_pending', isResolved: true },
    ]);
  });

  it('should_resolve_pending_and_create_missing_alert_on_january_1', async () => {
    // Arrange
    await insertBankAccount();
    await insertBankAccount();
    await evaluateOn(DECEMBER_31);
    // Act
    await evaluateOn(JANUARY_1);
    // Assert
    expect(await allAlerts()).toEqual([
      {
        type: 'year_end_snapshot_pending',
        isResolved: true,
        message:
          'Ainda falta a foto de 31/12 de 2 contas. Sincronize hoje: ela é a base dos bens e direitos no IR.',
      },
      {
        type: 'year_end_snapshot_missing',
        isResolved: false,
        message:
          '31/12/2026 terminou sem a foto de 2 contas. Confira esses saldos nos informes de rendimentos dos bancos.',
      },
    ]);
  });

  it('should_keep_a_single_missing_alert_during_january', async () => {
    // Arrange
    await insertBankAccount();
    await evaluateOn(JANUARY_1);
    // Act
    await evaluateOn(JANUARY_2);
    // Assert
    expect((await allAlerts()).map(({ type }) => type)).toEqual(['year_end_snapshot_missing']);
  });

  it('should_not_recreate_missing_alert_after_dismissal', async () => {
    // Arrange
    await insertBankAccount();
    await evaluateOn(JANUARY_1);
    await database.db.update(alerts).set({ dismissedAt: JANUARY_2 });
    // Act
    await evaluateOn(JANUARY_3);
    // Assert
    expect((await allAlerts()).map(({ type }) => type)).toEqual(['year_end_snapshot_missing']);
  });

  it('should_not_check_year_end_on_december_30', async () => {
    // Arrange
    await insertBankAccount();
    // Act
    await evaluateOn(DECEMBER_30);
    // Assert
    expect(await allAlerts()).toEqual([]);
  });

  it('should_not_check_year_end_on_february_1', async () => {
    // Arrange
    await insertBankAccount();
    // Act
    await evaluateOn(FEBRUARY_1);
    // Assert
    expect(await allAlerts()).toEqual([]);
  });

  it('should_resolve_a_leftover_pending_alert_when_the_first_evaluation_is_in_february', async () => {
    // Arrange
    await insertBankAccount();
    await evaluateOn(DECEMBER_31);
    // Act
    await evaluateOn(FEBRUARY_1);
    // Assert
    expect((await allAlerts()).map(({ type, isResolved }) => ({ type, isResolved }))).toEqual([
      { type: 'year_end_snapshot_pending', isResolved: true },
    ]);
  });

  it('should_create_the_other_alerts_when_year_end_evaluation_fails', async () => {
    // Arrange: a sincronização já isola a falha de `evaluateAll` (alerts-wiring.test.ts).
    await insertConnection(database.db, { status: 'error' });
    const { db } = database;
    const evaluator = new AlertEvaluator({
      alerts: new AlertsRepository(db),
      budgets: new BudgetsRepository(db),
      connections: new ConnectionsRepository(db),
      charges: new AlertChargesRepository(db),
      yearEndSnapshots: {
        countMissingSnapshots: () => Promise.reject(new Error('Teste: consulta falhou')),
      },
      now: () => DECEMBER_31,
    });
    // Act
    const evaluation = evaluator.evaluateAll();
    // Assert
    await expect(evaluation).rejects.toThrow('Teste: consulta falhou');
    expect((await allAlerts()).map(({ type }) => type)).toEqual(['connection_error']);
  });
});
