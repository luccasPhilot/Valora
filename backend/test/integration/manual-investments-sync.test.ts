import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { investments, investmentSnapshots } from '../../src/db/schema.js';
import { InvestmentsRepository } from '../../src/modules/investments/investments.repository.js';
import { todayInSaoPaulo } from '../../src/shared/dates.js';
import { insertManualInvestment } from './fixtures.js';
import { buildSyncHarness, runSync, type SyncHarness } from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const FUND_CENTS = 2_500_000;
const FAILED_ITEM_ID = 'item-1';

let harness: SyncHarness;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await harness.app.close();
});

async function snapshotsOf(investmentId: string) {
  return harness.database.db
    .select({ date: investmentSnapshots.date, balanceCents: investmentSnapshots.balanceCents })
    .from(investmentSnapshots)
    .where(eq(investmentSnapshots.investmentId, investmentId));
}

describe('foto diária das posições manuais', () => {
  it('should_save_todays_snapshot_with_the_last_informed_value_when_a_sync_runs', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(harness.database.db, {
      balanceCents: FUND_CENTS,
      balanceUpdatedOn: '2026-10-01',
    });
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await snapshotsOf(investmentId)).toEqual([
      { date: todayInSaoPaulo(harness.clock.now), balanceCents: FUND_CENTS },
    ]);
  });

  it('should_save_a_zero_snapshot_when_the_manual_position_is_closed', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(harness.database.db, { balanceCents: 0 });
    // Act
    await runSync(harness.syncService);
    // Assert
    expect((await snapshotsOf(investmentId))[0]?.balanceCents).toBe(0);
  });

  it('should_keep_a_single_snapshot_when_the_sync_runs_twice_on_the_same_day', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(harness.database.db);
    // Act
    await runSync(harness.syncService);
    await runSync(harness.syncService);
    // Assert
    expect(await snapshotsOf(investmentId)).toHaveLength(1);
  });

  it('should_save_the_snapshot_when_a_bank_fails_in_the_same_sync', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(harness.database.db);
    harness.sdk.removeItem(FAILED_ITEM_ID);
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect({ status: run.status, snapshots: await snapshotsOf(investmentId) }).toEqual({
      status: 'partial',
      snapshots: [{ date: todayInSaoPaulo(harness.clock.now), balanceCents: 2_500_000 }],
    });
  });

  it('should_finish_the_sync_and_log_only_the_error_type_when_the_snapshot_step_fails', async () => {
    // Arrange
    vi.spyOn(InvestmentsRepository.prototype, 'saveManualSnapshots').mockRejectedValue(
      new Error('conexão com valor 2500000 caiu'),
    );
    // Act
    const run = await runSync(harness.syncService);
    // Assert
    expect({
      status: run.status,
      log: harness.logLines.find((line) => line.msg === 'manual investments snapshot failed'),
    }).toEqual({
      status: 'success',
      log: expect.objectContaining({ errorType: 'Error' }),
    });
  });

  it('should_not_write_the_error_message_in_the_log_when_the_snapshot_step_fails', async () => {
    // Arrange
    vi.spyOn(InvestmentsRepository.prototype, 'saveManualSnapshots').mockRejectedValue(
      new Error('conexão com valor 2500000 caiu'),
    );
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(JSON.stringify(harness.logLines)).not.toContain('2500000');
  });
});

describe('a sincronização não toca nas posições manuais', () => {
  it('should_keep_the_manual_balance_when_every_bank_returns_no_investments', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(harness.database.db, {
      balanceCents: FUND_CENTS,
    });
    for (const fixture of harness.fixtures) fixture.investments = [];
    // Act
    await runSync(harness.syncService);
    const [stored] = await harness.database.db
      .select({ balanceCents: investments.balanceCents })
      .from(investments)
      .where(eq(investments.id, investmentId));
    // Assert
    expect(stored?.balanceCents).toBe(FUND_CENTS);
  });
});
