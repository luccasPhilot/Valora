import { describe, expect, it } from 'vitest';

import {
  budgetDedupeKey,
  budgetSituations,
  connectionDedupeKey,
  connectionSituations,
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
