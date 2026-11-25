import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { investments } from '../../src/db/schema.js';
import { YearEndSnapshotsRepository } from '../../src/modules/alerts/year-end-snapshots.repository.js';
import {
  archiveConnection,
  insertAccountSnapshot,
  insertAccountWith,
  insertConnection,
  insertInvestmentSnapshot,
  insertInvestmentWith,
  insertManualInvestment,
} from './fixtures.js';
import { connectTestDatabase, truncateAllTables } from './test-database.js';

const YEAR_END = '2026-12-31';
// Data fixa: com o `now()` padrão, os testes mudariam de resultado depois de 31/12/2026.
const CREATED_BEFORE_YEAR_END = new Date('2026-06-01T12:00:00Z');
const BALANCE_CENTS = 150_000;
// 23:30 de 31/12 em São Paulo: ainda é 31/12.
const LATE_ON_YEAR_END = new Date('2027-01-01T02:30:00Z');
// 02:00 de 01/01 em São Paulo.
const AFTER_YEAR_END = new Date('2027-01-01T05:00:00Z');

let database: ReturnType<typeof connectTestDatabase>;
let repository: YearEndSnapshotsRepository;
let connectionId: string;

beforeEach(async () => {
  database = connectTestDatabase();
  await truncateAllTables(database);
  repository = new YearEndSnapshotsRepository(database.db);
  connectionId = await insertConnection(database.db);
});

afterEach(async () => {
  await database.pool.end();
});

function insertBankAccount(
  overrides: Parameters<typeof insertAccountWith>[1] = {},
): Promise<string> {
  return insertAccountWith(database.db, {
    connectionId,
    createdAt: CREATED_BEFORE_YEAR_END,
    ...overrides,
  });
}

async function insertBankInvestment(balanceCents: number): Promise<string> {
  const investmentId = await insertInvestmentWith(database.db, connectionId, balanceCents);
  await setInvestmentCreatedAt(investmentId, CREATED_BEFORE_YEAR_END);
  return investmentId;
}

async function setInvestmentCreatedAt(investmentId: string, createdAt: Date): Promise<void> {
  await database.db.update(investments).set({ createdAt }).where(eq(investments.id, investmentId));
}

describe('countMissingSnapshots', () => {
  it('should_count_an_account_when_it_has_no_snapshot_on_the_date', async () => {
    // Arrange
    await insertBankAccount();
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 1, investments: 0 });
  });

  it('should_not_count_an_account_when_it_has_the_snapshot_of_the_date', async () => {
    // Arrange
    const accountId = await insertBankAccount();
    await insertAccountSnapshot(database.db, accountId, YEAR_END, BALANCE_CENTS);
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });

  it('should_not_count_an_account_when_its_snapshot_is_from_another_day', async () => {
    // Arrange
    const accountId = await insertBankAccount();
    await insertAccountSnapshot(database.db, accountId, '2026-12-30', BALANCE_CENTS);
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 1, investments: 0 });
  });

  it('should_count_a_hidden_account_when_it_has_no_snapshot', async () => {
    // Arrange
    await insertBankAccount({ isHidden: true });
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 1, investments: 0 });
  });

  it('should_not_count_the_cash_account', async () => {
    // Arrange
    await insertAccountWith(database.db, {
      type: 'cash',
      name: 'Dinheiro',
      createdAt: CREATED_BEFORE_YEAR_END,
    });
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });

  it('should_not_count_accounts_and_investments_when_the_bank_is_archived', async () => {
    // Arrange
    await insertBankAccount();
    await insertBankInvestment(BALANCE_CENTS);
    await archiveConnection(database.db, connectionId, '2026-12-01T12:00:00Z');
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });

  it('should_count_an_investment_when_it_has_balance_and_no_snapshot', async () => {
    // Arrange
    await insertBankInvestment(BALANCE_CENTS);
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 1 });
  });

  it('should_not_count_an_investment_when_it_has_the_snapshot_of_the_date', async () => {
    // Arrange
    const investmentId = await insertBankInvestment(BALANCE_CENTS);
    await insertInvestmentSnapshot(database.db, investmentId, YEAR_END, BALANCE_CENTS);
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });

  it('should_not_count_an_investment_when_its_balance_is_zero', async () => {
    // Arrange
    await insertBankInvestment(0);
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });

  it('should_count_a_manual_investment_when_it_has_no_snapshot', async () => {
    // Arrange
    await insertManualInvestment(database.db, { createdAt: CREATED_BEFORE_YEAR_END });
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 1 });
  });

  it('should_count_an_account_when_it_was_created_late_on_the_date_in_sao_paulo', async () => {
    // Arrange
    await insertBankAccount({ createdAt: LATE_ON_YEAR_END });
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 1, investments: 0 });
  });

  it('should_not_count_an_account_when_it_was_created_after_the_date', async () => {
    // Arrange
    await insertBankAccount({ createdAt: AFTER_YEAR_END });
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });

  it('should_not_count_an_investment_when_it_was_created_after_the_date', async () => {
    // Arrange
    const investmentId = await insertManualInvestment(database.db);
    await setInvestmentCreatedAt(investmentId, AFTER_YEAR_END);
    // Act
    const counts = await repository.countMissingSnapshots(YEAR_END);
    // Assert
    expect(counts).toEqual({ accounts: 0, investments: 0 });
  });
});
