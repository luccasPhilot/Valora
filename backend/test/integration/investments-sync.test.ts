import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { investments, investmentSnapshots } from '../../src/db/schema.js';
import { todayInSaoPaulo } from '../../src/shared/dates.js';
import {
  buildSyncHarness,
  connectionOf,
  countRows,
  fixtureOf,
  newestTransaction,
  runSync,
  type SyncHarness,
} from './sync-harness.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

let harness: SyncHarness;

beforeEach(async () => {
  const database = connectTestDatabase();
  await truncateAllTables(database);
  harness = buildSyncHarness({ database });
});

afterEach(async () => {
  await harness.app.close();
});

async function investmentsOfItem(pluggyItemId: string) {
  const connection = await connectionOf(harness.database, pluggyItemId);
  return harness.database.db
    .select()
    .from(investments)
    .where(eq(investments.connectionId, connection.id));
}

async function snapshotsOf(investmentId: string) {
  return harness.database.db
    .select()
    .from(investmentSnapshots)
    .where(eq(investmentSnapshots.investmentId, investmentId));
}

// Primeiro investimento do item com saldo, para o teste poder fazê-lo sumir.
function firstFundedInvestmentId(pluggyItemId: string): string {
  const funded = fixtureOf(harness.fixtures, pluggyItemId).investments.find(
    (investment) => investment.balance > 0,
  );
  if (!funded) throw new Error(`Teste: item ${pluggyItemId} sem investimento com saldo`);
  return funded.id;
}

const MS_PER_DAY = 86_400_000;

/** O item passa a vir com outra situação de coleta no Pluggy. */
function setItemCollection(pluggyItemId: string, collection: Record<string, unknown>): void {
  Object.assign(fixtureOf(harness.fixtures, pluggyItemId).item, collection);
}

const PARTIAL_WITHOUT_INVESTMENTS = {
  executionStatus: 'PARTIAL_SUCCESS',
  statusDetail: { investments: { isUpdated: false, lastUpdatedAt: null } },
};

async function positionOf(pluggyItemId: string, pluggyInvestmentId: string) {
  const investment = (await investmentsOfItem(pluggyItemId)).find(
    (row) => row.pluggyInvestmentId === pluggyInvestmentId,
  );
  if (!investment) throw new Error(`Teste: investimento ${pluggyInvestmentId} não existe`);
  const today = todayInSaoPaulo(harness.clock.now);
  const todaySnapshot = (await snapshotsOf(investment.id)).find(({ date }) => date === today);
  return { balance: investment.balanceCents, todaySnapshot: todaySnapshot?.balanceCents };
}

function removeInvestment(pluggyItemId: string, investmentId: string): void {
  const fixture = fixtureOf(harness.fixtures, pluggyItemId);
  fixture.investments = fixture.investments.filter((investment) => investment.id !== investmentId);
}

describe('subtipo do investimento', () => {
  it('should_save_the_subtype_when_pluggy_sends_it', async () => {
    // Arrange
    const expectedCdbCount = fixtureOf(harness.fixtures, 'item-1').investments.filter(
      (investment) => investment.subtype === 'CDB',
    ).length;
    // Act
    await runSync(harness.syncService);
    // Assert
    const saved = await investmentsOfItem('item-1');
    expect(saved.filter(({ subtype }) => subtype === 'CDB')).toHaveLength(expectedCdbCount);
  });

  it('should_save_null_subtype_when_pluggy_does_not_send_it', async () => {
    // Arrange
    const investmentId = firstFundedInvestmentId('item-1');
    const target = fixtureOf(harness.fixtures, 'item-1').investments.find(
      ({ id }) => id === investmentId,
    );
    if (target) delete target.subtype;
    // Act
    await runSync(harness.syncService);
    // Assert
    const saved = await investmentsOfItem('item-1');
    expect(
      saved.find(({ pluggyInvestmentId }) => pluggyInvestmentId === investmentId)?.subtype,
    ).toBeNull();
  });
});

describe('investimento que sumiu da resposta do banco', () => {
  it('should_zero_the_position_and_save_a_zero_snapshot_when_the_bank_stops_returning_it', async () => {
    // Arrange
    await runSync(harness.syncService);
    const vanishedId = firstFundedInvestmentId('item-1');
    removeInvestment('item-1', vanishedId);
    // Act
    await runSync(harness.syncService);
    // Assert
    const vanished = (await investmentsOfItem('item-1')).find(
      ({ pluggyInvestmentId }) => pluggyInvestmentId === vanishedId,
    );
    const today = todayInSaoPaulo(harness.clock.now);
    const todaySnapshot = (await snapshotsOf(vanished?.id ?? '')).find(
      ({ date }) => date === today,
    );
    expect({ balance: vanished?.balanceCents, snapshot: todaySnapshot?.balanceCents }).toEqual({
      balance: 0,
      snapshot: 0,
    });
  });

  it('should_zero_every_position_of_the_bank_when_it_returns_an_empty_list', async () => {
    // Arrange
    await runSync(harness.syncService);
    fixtureOf(harness.fixtures, 'item-1').investments = [];
    // Act
    await runSync(harness.syncService);
    // Assert
    const balances = (await investmentsOfItem('item-1')).map(({ balanceCents }) => balanceCents);
    expect(balances.every((balance) => balance === 0)).toBe(true);
  });

  it('should_keep_the_other_banks_positions_when_one_bank_returns_an_empty_list', async () => {
    // Arrange
    await runSync(harness.syncService);
    const before = await investmentsOfItem('item-2');
    fixtureOf(harness.fixtures, 'item-1').investments = [];
    // Act
    await runSync(harness.syncService);
    // Assert
    const after = await investmentsOfItem('item-2');
    expect(after.map(({ balanceCents }) => balanceCents)).toEqual(
      before.map(({ balanceCents }) => balanceCents),
    );
  });

  it('should_not_zero_vanished_positions_when_investments_collection_is_partial', async () => {
    // Arrange
    await runSync(harness.syncService);
    const vanishedId = firstFundedInvestmentId('item-1');
    const { balance } = await positionOf('item-1', vanishedId);
    removeInvestment('item-1', vanishedId);
    setItemCollection('item-1', PARTIAL_WITHOUT_INVESTMENTS);
    harness.clock.now = new Date(harness.clock.now.getTime() + MS_PER_DAY);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await positionOf('item-1', vanishedId)).toEqual({ balance, todaySnapshot: undefined });
  });

  it('should_not_zero_vanished_positions_when_item_is_updating', async () => {
    // Arrange
    await runSync(harness.syncService);
    const before = await investmentsOfItem('item-1');
    fixtureOf(harness.fixtures, 'item-1').investments = [];
    setItemCollection('item-1', { status: 'UPDATING', executionStatus: 'INVESTMENTS_IN_PROGRESS' });
    // Act
    await runSync(harness.syncService);
    // Assert
    const after = await investmentsOfItem('item-1');
    expect(after.map(({ balanceCents }) => balanceCents)).toEqual(
      before.map(({ balanceCents }) => balanceCents),
    );
  });

  it('should_zero_vanished_positions_when_partial_success_collected_investments', async () => {
    // Arrange
    await runSync(harness.syncService);
    const vanishedId = firstFundedInvestmentId('item-1');
    removeInvestment('item-1', vanishedId);
    setItemCollection('item-1', {
      executionStatus: 'PARTIAL_SUCCESS',
      statusDetail: { investments: { isUpdated: true, lastUpdatedAt: null } },
    });
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await positionOf('item-1', vanishedId)).toEqual({ balance: 0, todaySnapshot: 0 });
  });

  it('should_save_zero_snapshot_when_pluggy_returns_total_withdrawal_during_partial_collection', async () => {
    // Arrange
    await runSync(harness.syncService);
    const withdrawnId = firstFundedInvestmentId('item-1');
    const withdrawn = fixtureOf(harness.fixtures, 'item-1').investments.find(
      ({ id }) => id === withdrawnId,
    );
    if (!withdrawn) throw new Error('Teste: investimento não existe');
    Object.assign(withdrawn, { balance: 0, status: 'TOTAL_WITHDRAWAL' });
    setItemCollection('item-1', PARTIAL_WITHOUT_INVESTMENTS);
    // Act
    await runSync(harness.syncService);
    // Assert
    expect(await positionOf('item-1', withdrawnId)).toEqual({ balance: 0, todaySnapshot: 0 });
  });

  it('should_not_change_investments_when_the_bank_sync_fails', async () => {
    // Arrange
    await runSync(harness.syncService);
    const before = await investmentsOfItem('item-2');
    const fixture = fixtureOf(harness.fixtures, 'item-2');
    fixture.investments = [];
    // Parcela acima do `integer` do PostgreSQL passa no Zod e quebra a gravação do banco.
    newestTransaction(fixture, 'POSTED').creditCardMetadata = {
      installmentNumber: 1,
      totalInstallments: 3_000_000_000,
    };
    // Act
    await runSync(harness.syncService);
    // Assert
    const after = await investmentsOfItem('item-2');
    expect(after.map(({ balanceCents }) => balanceCents)).toEqual(
      before.map(({ balanceCents }) => balanceCents),
    );
  });

  it('should_restore_the_position_when_the_investment_comes_back', async () => {
    // Arrange
    await runSync(harness.syncService);
    const fixture = fixtureOf(harness.fixtures, 'item-1');
    const vanishedId = firstFundedInvestmentId('item-1');
    const original = fixture.investments.find(({ id }) => id === vanishedId);
    removeInvestment('item-1', vanishedId);
    await runSync(harness.syncService);
    if (original) fixture.investments.push(original);
    // Act
    await runSync(harness.syncService);
    // Assert
    const restored = (await investmentsOfItem('item-1')).find(
      ({ pluggyInvestmentId }) => pluggyInvestmentId === vanishedId,
    );
    expect(restored?.balanceCents).toBe(Math.round((original?.balance ?? 0) * 100));
  });

  it('should_not_duplicate_snapshots_when_syncing_twice_on_the_same_day', async () => {
    // Arrange
    await runSync(harness.syncService);
    removeInvestment('item-1', firstFundedInvestmentId('item-1'));
    // Act
    await runSync(harness.syncService);
    // Assert
    const counts = await countRows(harness.database);
    expect(counts.investmentSnapshots).toBe(counts.investments);
  });
});
