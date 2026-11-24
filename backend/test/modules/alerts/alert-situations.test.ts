import { describe, expect, it } from 'vitest';

import {
  budgetDedupeKey,
  budgetSituations,
  connectionDedupeKey,
  connectionSituations,
  type MissingSnapshotCounts,
  yearEndCheckFor,
  yearEndSnapshotSituation,
} from '../../../src/modules/alerts/alert-situations.js';
import type { BudgetRecord } from '../../../src/modules/budgets/budgets.repository.js';
import type {
  ConnectionRecord,
  ConnectionStatus,
} from '../../../src/modules/connections/connections.repository.js';

const MONTH = '2026-11-01';
const MARKET_ID = '11111111-1111-4111-8111-111111111111';
const LIMIT_CENTS = 100_000;

function budget(spentCents: number, limitCents = LIMIT_CENTS): BudgetRecord {
  return {
    categoryId: MARKET_ID,
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    limitCents,
    spentCents,
  };
}

function connection(
  status: ConnectionStatus,
  overrides: Partial<ConnectionRecord> = {},
): ConnectionRecord {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    pluggyItemId: 'item-1',
    institutionName: 'Banco Azul',
    institutionLogoUrl: null,
    status,
    statusDetail: null,
    lastSyncedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

describe('budgetSituations', () => {
  it('should_return_nothing_when_spent_is_below_eighty_percent', () => {
    // Arrange
    const records = [budget(79_999)];
    // Act
    const situations = budgetSituations(MONTH, records);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_return_a_warning_when_spent_reaches_exactly_eighty_percent', () => {
    // Arrange
    const records = [budget(80_000)];
    // Act
    const situations = budgetSituations(MONTH, records);
    // Assert
    expect(situations).toEqual([
      {
        type: 'budget_warning',
        dedupeKey: `budget_warning:${MARKET_ID}:2026-11`,
        message: 'Mercado chegou a 80% do orçamento de novembro',
        categoryId: MARKET_ID,
        connectionId: null,
        transactionId: null,
      },
    ]);
  });

  it('should_return_a_warning_when_spent_equals_the_limit', () => {
    // Arrange
    const records = [budget(100_000)];
    // Act
    const situations = budgetSituations(MONTH, records);
    // Assert
    expect(situations.map((situation) => situation.type)).toEqual(['budget_warning']);
  });

  it('should_return_only_the_exceeded_alert_when_spent_passes_the_limit_by_one_cent', () => {
    // Arrange
    const records = [budget(100_001)];
    // Act
    const situations = budgetSituations(MONTH, records);
    // Assert
    expect(situations).toEqual([
      {
        type: 'budget_exceeded',
        dedupeKey: `budget_exceeded:${MARKET_ID}:2026-11`,
        message: 'Mercado estourou o orçamento de novembro',
        categoryId: MARKET_ID,
        connectionId: null,
        transactionId: null,
      },
    ]);
  });

  it('should_return_nothing_when_a_refund_brings_spent_back_below_eighty_percent', () => {
    // Arrange
    const records = [budget(70_000)];
    // Act
    const situations = budgetSituations(MONTH, records);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_return_nothing_when_there_are_no_budgets_for_the_month', () => {
    // Arrange
    const records: BudgetRecord[] = [];
    // Act
    const situations = budgetSituations(MONTH, records);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_not_put_amounts_in_the_message_when_the_budget_is_exceeded', () => {
    // Arrange
    const records = [budget(123_456)];
    // Act
    const [situation] = budgetSituations(MONTH, records);
    // Assert
    expect(situation?.message).not.toMatch(/\d/);
  });
});

describe('connectionSituations', () => {
  it('should_return_an_alert_when_the_connection_has_an_error', () => {
    // Arrange
    const connections = [connection('error', { statusDetail: 'O acesso precisa ser refeito.' })];
    // Act
    const situations = connectionSituations(connections);
    // Assert
    expect(situations).toEqual([
      {
        type: 'connection_error',
        dedupeKey: connectionDedupeKey(connections[0]?.id ?? ''),
        message: 'Banco Azul: O acesso precisa ser refeito.',
        categoryId: null,
        connectionId: connections[0]?.id,
        transactionId: null,
      },
    ]);
  });

  it('should_return_an_alert_when_the_consent_expired', () => {
    // Arrange
    const connections = [connection('consent_expired', { statusDetail: 'Consentimento venceu.' })];
    // Act
    const situations = connectionSituations(connections);
    // Assert
    expect(situations.map((situation) => situation.type)).toEqual(['connection_error']);
  });

  it('should_return_an_alert_when_the_bank_was_removed_from_meu_pluggy', () => {
    // Arrange
    const connections = [
      connection('item_not_found', {
        statusDetail: 'Este banco foi removido do Meu Pluggy. Remova-o do Valora.',
      }),
    ];
    // Act
    const [situation] = connectionSituations(connections);
    // Assert
    expect(situation?.message).toBe(
      'Banco Azul: Este banco foi removido do Meu Pluggy. Remova-o do Valora.',
    );
  });

  it('should_use_a_default_message_when_the_status_detail_is_missing', () => {
    // Arrange
    const connections = [connection('error')];
    // Act
    const [situation] = connectionSituations(connections);
    // Assert
    expect(situation?.message).toBe('Banco Azul: Este banco não está sincronizando.');
  });

  it('should_return_nothing_when_the_connection_is_ok', () => {
    // Arrange
    const connections = [connection('ok')];
    // Act
    const situations = connectionSituations(connections);
    // Assert
    expect(situations).toEqual([]);
  });

  it('should_return_nothing_when_the_connection_is_syncing', () => {
    // Arrange
    const connections = [connection('syncing', { statusDetail: 'Atualizando agora.' })];
    // Act
    const situations = connectionSituations(connections);
    // Assert
    expect(situations).toEqual([]);
  });
});

describe('budgetDedupeKey', () => {
  it('should_build_the_key_from_type_category_and_year_month', () => {
    // Arrange
    const month = '2026-11-01';
    // Act
    const key = budgetDedupeKey('budget_warning', MARKET_ID, month);
    // Assert
    expect(key).toBe(`budget_warning:${MARKET_ID}:2026-11`);
  });
});

describe('yearEndCheckFor', () => {
  it('should_return_null_when_today_is_december_30', () => {
    // Arrange
    const today = '2026-12-30';
    // Act
    const check = yearEndCheckFor(today);
    // Assert
    expect(check).toBeNull();
  });

  it('should_return_pending_for_the_same_day_when_today_is_december_31', () => {
    // Arrange
    const today = '2026-12-31';
    // Act
    const check = yearEndCheckFor(today);
    // Assert
    expect(check).toEqual({ kind: 'pending', date: '2026-12-31' });
  });

  it('should_return_missing_for_the_previous_year_when_today_is_january_1', () => {
    // Arrange
    const today = '2027-01-01';
    // Act
    const check = yearEndCheckFor(today);
    // Assert
    expect(check).toEqual({ kind: 'missing', date: '2026-12-31' });
  });

  it('should_return_missing_for_the_previous_year_when_today_is_january_31', () => {
    // Arrange
    const today = '2027-01-31';
    // Act
    const check = yearEndCheckFor(today);
    // Assert
    expect(check).toEqual({ kind: 'missing', date: '2026-12-31' });
  });

  it('should_return_null_when_today_is_february_1', () => {
    // Arrange
    const today = '2027-02-01';
    // Act
    const check = yearEndCheckFor(today);
    // Assert
    expect(check).toBeNull();
  });

  it('should_return_the_leap_year_december_31_when_today_is_in_the_following_january', () => {
    // Arrange
    const today = '2029-01-15';
    // Act
    const check = yearEndCheckFor(today);
    // Assert
    expect(check).toEqual({ kind: 'missing', date: '2028-12-31' });
  });
});

describe('yearEndSnapshotSituation', () => {
  const PENDING = { kind: 'pending', date: '2026-12-31' } as const;
  const MISSING = { kind: 'missing', date: '2026-12-31' } as const;

  function counts(accounts: number, investments: number): MissingSnapshotCounts {
    return { accounts, investments };
  }

  it('should_return_null_when_nothing_is_missing', () => {
    // Arrange
    const missing = counts(0, 0);
    // Act
    const situation = yearEndSnapshotSituation(PENDING, missing);
    // Assert
    expect(situation).toBeNull();
  });

  it('should_return_the_pending_situation_when_one_account_is_missing', () => {
    // Arrange
    const missing = counts(1, 0);
    // Act
    const situation = yearEndSnapshotSituation(PENDING, missing);
    // Assert
    expect(situation).toEqual({
      type: 'year_end_snapshot_pending',
      dedupeKey: 'year_end_snapshot_pending:2026',
      message:
        'Ainda falta a foto de 31/12 de 1 conta. Sincronize hoje: ela é a base dos bens e direitos no IR.',
      categoryId: null,
      connectionId: null,
      transactionId: null,
    });
  });

  it('should_use_the_plural_when_two_accounts_are_missing', () => {
    // Arrange
    const missing = counts(2, 0);
    // Act
    const situation = yearEndSnapshotSituation(PENDING, missing);
    // Assert
    expect(situation?.message).toBe(
      'Ainda falta a foto de 31/12 de 2 contas. Sincronize hoje: ela é a base dos bens e direitos no IR.',
    );
  });

  it('should_name_the_investment_when_only_one_investment_is_missing', () => {
    // Arrange
    const missing = counts(0, 1);
    // Act
    const situation = yearEndSnapshotSituation(PENDING, missing);
    // Assert
    expect(situation?.message).toBe(
      'Ainda falta a foto de 31/12 de 1 investimento. Sincronize hoje: ela é a base dos bens e direitos no IR.',
    );
  });

  it('should_join_accounts_and_investments_when_both_are_missing', () => {
    // Arrange
    const missing = counts(2, 1);
    // Act
    const situation = yearEndSnapshotSituation(PENDING, missing);
    // Assert
    expect(situation?.message).toBe(
      'Ainda falta a foto de 31/12 de 2 contas e 1 investimento. Sincronize hoje: ela é a base dos bens e direitos no IR.',
    );
  });

  it('should_return_the_missing_situation_with_the_year_when_checking_after_new_year', () => {
    // Arrange
    const missing = counts(2, 0);
    // Act
    const situation = yearEndSnapshotSituation(MISSING, missing);
    // Assert
    expect(situation).toEqual({
      type: 'year_end_snapshot_missing',
      dedupeKey: 'year_end_snapshot_missing:2026',
      message:
        '31/12/2026 terminou sem a foto de 2 contas. Confira esses saldos nos informes de rendimentos dos bancos.',
      categoryId: null,
      connectionId: null,
      transactionId: null,
    });
  });

  it('should_never_carry_money_values_in_the_message', () => {
    // Arrange
    const missing = counts(3, 4);
    // Act
    const messages = [
      yearEndSnapshotSituation(PENDING, missing)?.message,
      yearEndSnapshotSituation(MISSING, missing)?.message,
    ].join(' ');
    // Assert
    expect(messages).not.toMatch(/R\$|\d+,\d{2}/);
  });
});
