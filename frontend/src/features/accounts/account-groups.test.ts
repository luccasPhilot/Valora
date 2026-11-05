import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/api/accounts';

import { groupByInstitution } from './account-groups';

const NUBANK = {
  id: '11111111-1111-4111-8111-111111111111',
  institutionName: 'Nubank',
  status: 'ok',
  statusDetail: null,
  lastSyncedAt: null,
} as const;
const ITAU = { ...NUBANK, id: '22222222-2222-4222-8222-222222222222', institutionName: 'Itaú' };

function account(id: string, overrides: Partial<Account> = {}): Account {
  return {
    id,
    name: `Conta ${id}`,
    type: 'checking',
    lastDigits: null,
    balanceCents: 1000,
    creditLimitCents: null,
    availableLimitCents: null,
    isHidden: false,
    connection: NUBANK,
    ...overrides,
  };
}

describe('groupByInstitution', () => {
  it('should_put_accounts_of_the_same_connection_in_one_group_when_they_share_it', () => {
    // Arrange
    const accounts = [account('a'), account('b', { type: 'credit_card' })];
    // Act
    const groups = groupByInstitution(accounts);
    // Assert
    expect(groups.map((group) => group.accounts.length)).toEqual([2]);
  });

  it('should_keep_one_group_per_connection_when_two_banks_exist', () => {
    // Arrange
    const accounts = [account('a'), account('b', { connection: ITAU })];
    // Act
    const groups = groupByInstitution(accounts);
    // Assert
    expect(groups.map((group) => group.connection.institutionName)).toEqual(['Nubank', 'Itaú']);
  });

  it('should_leave_the_cash_account_out_when_it_has_no_connection', () => {
    // Arrange
    const accounts = [account('a'), account('cash', { type: 'cash', connection: null })];
    // Act
    const groups = groupByInstitution(accounts);
    // Assert
    expect(groups.flatMap((group) => group.accounts.map((member) => member.id))).toEqual(['a']);
  });

  it('should_flag_the_group_as_problem_when_consent_expired', () => {
    // Arrange
    const accounts = [account('a', { connection: { ...ITAU, status: 'consent_expired' } })];
    // Act
    const groups = groupByInstitution(accounts);
    // Assert
    expect(groups[0]?.hasProblem).toBe(true);
  });

  it('should_not_flag_the_group_when_the_connection_is_syncing', () => {
    // Arrange
    const accounts = [account('a', { connection: { ...NUBANK, status: 'syncing' } })];
    // Act
    const groups = groupByInstitution(accounts);
    // Assert
    expect(groups[0]?.hasProblem).toBe(false);
  });

  it('should_return_no_groups_when_there_are_no_accounts', () => {
    // Arrange
    const accounts: Account[] = [];
    // Act
    const groups = groupByInstitution(accounts);
    // Assert
    expect(groups).toEqual([]);
  });
});
