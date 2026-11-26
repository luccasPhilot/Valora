import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { alerts, budgets, pushSubscriptions, transactions } from '../../src/db/schema.js';
import { type AlertsModule, createAlertsModule } from '../../src/modules/alerts/alerts.module.js';
import { createPushModule } from '../../src/modules/push/push.module.js';
import { FakePushSender, TEST_VAPID } from '../helpers/fake-push-sender.js';
import { TEST_CONFIG } from '../helpers/test-app.js';
import { insertAccountWith, insertCategory, transactionValues } from './fixtures.js';
import { buildSyncHarness, type SyncHarness } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const NOVEMBER_FIRST_DAY = '2026-11-01';
const LIMIT_CENTS = 100_000;
const ENDPOINT = 'https://push.exemplo.test/send/aparelho-1';
const REVIEW_INBOX_BODY = 'Há transações para revisar';
const FULL_INBOX_SIZE = 10;

const clock = { now: new Date('2026-11-15T13:00:00Z') };
const silentLogger = { error: () => undefined, warn: () => undefined };

let database: ReturnType<typeof connectTestDatabase>;
let accountId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  clock.now = new Date('2026-11-15T13:00:00Z');
  accountId = await insertAccountWith(database.db);
  await database.db
    .insert(pushSubscriptions)
    .values({ endpoint: ENDPOINT, p256dh: 'chave', auth: 'auth' });
});

afterEach(async () => {
  if (!database.pool.ended) await database.pool.end();
});

function buildAlertsModule(sender: FakePushSender, hasVapid = true): AlertsModule {
  const push = createPushModule({
    config: { vapid: hasVapid ? TEST_VAPID : null },
    database,
    logger: silentLogger,
    now: () => clock.now,
    sender,
  });
  return createAlertsModule({
    database,
    logger: silentLogger,
    now: () => clock.now,
    pushNotifier: push.pushNotifier,
  });
}

async function exceedNewBudget(): Promise<void> {
  const categoryId = await insertCategory(database.db);
  await database.db
    .insert(budgets)
    .values({ categoryId, month: NOVEMBER_FIRST_DAY, limitCents: LIMIT_CENTS });
  await database.db
    .insert(transactions)
    .values(transactionValues(accountId, { categoryId, amountCents: -(LIMIT_CENTS + 1) }));
}

describe('push nos alertas novos', () => {
  it('should_send_the_text_of_the_type_when_one_alert_is_created', async () => {
    // Arrange
    const sender = new FakePushSender();
    const module = buildAlertsModule(sender);
    await exceedNewBudget();
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    expect(sender.bodies()).toEqual(['Um orçamento passou do limite']);
  });

  it('should_send_a_single_push_when_three_alerts_are_created_in_one_evaluation', async () => {
    // Arrange
    const sender = new FakePushSender();
    const module = buildAlertsModule(sender);
    await exceedNewBudget();
    await exceedNewBudget();
    await exceedNewBudget();
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    expect(sender.bodies()).toEqual(['3 alertas novos no Valora']);
  });

  it('should_not_send_when_the_alert_already_existed', async () => {
    // Arrange
    const sender = new FakePushSender();
    const module = buildAlertsModule(sender);
    await exceedNewBudget();
    await module.evaluator.evaluateAll();
    sender.sent.length = 0;
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    expect(sender.sent).toEqual([]);
  });

  it('should_still_create_the_alert_and_not_throw_when_sending_fails', async () => {
    // Arrange
    const sender = new FakePushSender(() => 'throw');
    const module = buildAlertsModule(sender);
    await exceedNewBudget();
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    expect(await database.db.$count(alerts)).toBe(1);
  });

  it('should_delete_the_subscription_when_the_push_service_answers_gone', async () => {
    // Arrange
    const sender = new FakePushSender(() => 'gone');
    const module = buildAlertsModule(sender);
    await exceedNewBudget();
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    expect(await database.db.$count(pushSubscriptions)).toBe(0);
  });

  it('should_keep_the_subscription_and_stamp_success_when_the_push_is_sent', async () => {
    // Arrange
    const sender = new FakePushSender();
    const module = buildAlertsModule(sender);
    await exceedNewBudget();
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    const [row] = await database.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, ENDPOINT));
    expect(row?.lastSuccessAt).not.toBeNull();
  });

  it('should_not_call_the_sender_when_push_is_off', async () => {
    // Arrange
    const sender = new FakePushSender();
    const module = buildAlertsModule(sender, false);
    await exceedNewBudget();
    // Act
    await module.evaluator.evaluateAll();
    // Assert
    expect(sender.sent).toEqual([]);
  });
});

describe('push da caixa Para revisar na sincronização', () => {
  let sender: FakePushSender;
  let harness: SyncHarness;

  beforeEach(async () => {
    sender = new FakePushSender();
    harness = buildSyncHarness({
      database,
      config: { ...TEST_CONFIG, vapid: TEST_VAPID },
      pushSender: sender,
    });
    await database.db.insert(transactions).values(
      Array.from({ length: FULL_INBOX_SIZE }, (_, index) =>
        transactionValues(accountId, {
          description: `Compra ${index}`,
          descriptionNormalized: `COMPRA ${index}`,
        }),
      ),
    );
  });

  afterEach(async () => {
    await harness.app.close();
  });

  function reviewPushes(): string[] {
    return sender.bodies().filter((body) => body === REVIEW_INBOX_BODY);
  }

  it('should_notify_when_the_scheduled_sync_ends_with_a_full_inbox', async () => {
    // Act
    await harness.syncService.runScheduled();
    // Assert
    expect(reviewPushes()).toEqual([REVIEW_INBOX_BODY]);
  });

  it('should_notify_only_once_when_the_scheduled_sync_runs_twice_on_the_same_day', async () => {
    // Arrange
    await harness.syncService.runScheduled();
    // Act
    await harness.syncService.runScheduled();
    // Assert
    expect(reviewPushes()).toHaveLength(1);
  });

  it('should_not_notify_when_the_sync_is_manual', async () => {
    // Act
    const started = await harness.syncService.start('manual');
    if (started.status === 'started') await started.finished;
    // Assert
    expect(reviewPushes()).toEqual([]);
  });
});
