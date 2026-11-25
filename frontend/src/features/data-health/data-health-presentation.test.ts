import { describe, expect, it } from 'vitest';

import type { ConsentStatus, DataHealth } from '@/lib/api/data-health';

import {
  countAttentionPoints,
  describeAttention,
  describeConsent,
  describeDivergence,
  describeLastTransaction,
  describeStaleAccount,
  describeSyncCounts,
  describeSyncMoment,
  describeSyncRun,
  describeSyncTrigger,
  divergenceTransactionsPath,
  syncResultOf,
} from './data-health-presentation';

const ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const DIVERGENCE = {
  accountId: ACCOUNT_ID,
  accountName: 'Conta corrente',
  from: '2026-11-03',
  to: '2026-11-04',
  differenceCents: -12000,
};
const STALE = {
  accountId: ACCOUNT_ID,
  accountName: 'Cartão',
  lastTransactionDate: '2026-11-10',
  daysWithoutTransactions: 14,
};

function consent(overrides: Partial<ConsentStatus> = {}): ConsentStatus {
  return {
    connectionId: '11111111-1111-4111-8111-111111111111',
    institutionName: 'Itaú',
    expiresAt: '2026-12-28T15:00:00.000Z',
    daysLeft: 34,
    ...overrides,
  };
}

describe('describeConsent', () => {
  it('should_show_only_the_date_when_the_consent_expires_in_more_than_30_days', () => {
    // Arrange & Act
    const text = describeConsent(consent());
    // Assert
    expect(text).toBe('Vence em 28/12/2026');
  });

  it('should_show_the_days_left_when_the_consent_expires_within_30_days', () => {
    // Arrange & Act
    const text = describeConsent(consent({ daysLeft: 7 }));
    // Assert
    expect(text).toBe('Vence em 28/12/2026 (em 7 dias)');
  });

  it('should_say_tomorrow_when_the_consent_expires_in_1_day', () => {
    // Arrange & Act
    const text = describeConsent(consent({ daysLeft: 1 }));
    // Assert
    expect(text).toBe('Vence em 28/12/2026 (amanhã)');
  });

  it('should_say_it_expired_when_days_left_is_negative', () => {
    // Arrange & Act
    const text = describeConsent(consent({ daysLeft: -2 }));
    // Assert
    expect(text).toBe('Venceu em 28/12/2026');
  });

  it('should_say_the_bank_did_not_inform_when_there_is_no_expiry', () => {
    // Arrange & Act
    const text = describeConsent(consent({ expiresAt: null, daysLeft: null }));
    // Assert
    expect(text).toBe('O banco não informou o vencimento');
  });
});

describe('describeDivergence', () => {
  it('should_name_the_period_of_the_possible_missing_transaction', () => {
    // Arrange & Act
    const text = describeDivergence(DIVERGENCE);
    // Assert
    expect(text).toBe('Possível transação faltando entre 03/11 e 04/11');
  });
});

describe('divergenceTransactionsPath', () => {
  it('should_filter_transactions_by_the_account_and_the_period', () => {
    // Arrange & Act
    const path = divergenceTransactionsPath(DIVERGENCE);
    // Assert
    expect(path).toBe(
      `/transacoes?period=custom&from=2026-11-03&to=2026-11-04&account=${ACCOUNT_ID}`,
    );
  });
});

describe('describeStaleAccount', () => {
  it('should_say_how_many_days_without_transactions', () => {
    // Arrange & Act
    const text = describeStaleAccount(STALE);
    // Assert
    expect(text).toBe('Sem transações há 14 dias');
  });

  it('should_show_the_last_transaction_date', () => {
    // Arrange & Act
    const text = describeLastTransaction(STALE);
    // Assert
    expect(text).toBe('Última em 10/11');
  });

  it('should_say_there_is_no_transaction_yet_when_the_account_never_had_one', () => {
    // Arrange & Act
    const text = describeLastTransaction({ ...STALE, lastTransactionDate: null });
    // Assert
    expect(text).toBe('Nenhuma transação ainda');
  });
});

describe('countAttentionPoints', () => {
  const EMPTY: DataHealth = { consents: [], divergences: [], staleAccounts: [] };

  it('should_count_zero_when_the_consent_is_far_away', () => {
    // Arrange
    const dataHealth = { ...EMPTY, consents: [consent()] };
    // Act
    const count = countAttentionPoints(dataHealth);
    // Assert
    expect(count).toBe(0);
  });

  it('should_count_zero_when_the_bank_did_not_inform_the_expiry', () => {
    // Arrange
    const dataHealth = { ...EMPTY, consents: [consent({ expiresAt: null, daysLeft: null })] };
    // Act
    const count = countAttentionPoints(dataHealth);
    // Assert
    expect(count).toBe(0);
  });

  it('should_count_each_expiring_consent_divergence_and_stale_account', () => {
    // Arrange
    const dataHealth = {
      consents: [consent({ daysLeft: 30 })],
      divergences: [DIVERGENCE],
      staleAccounts: [STALE],
    };
    // Act
    const count = countAttentionPoints(dataHealth);
    // Assert
    expect(count).toBe(3);
  });
});

describe('describeAttention', () => {
  it('should_say_everything_is_fine_when_there_is_nothing_to_check', () => {
    // Arrange & Act
    const text = describeAttention(0);
    // Assert
    expect(text).toBe('Tudo certo com os dados');
  });

  it('should_use_the_singular_when_there_is_one_point', () => {
    // Arrange & Act
    const text = describeAttention(1);
    // Assert
    expect(text).toBe('1 ponto para conferir');
  });

  it('should_use_the_plural_when_there_are_several_points', () => {
    // Arrange & Act
    const text = describeAttention(3);
    // Assert
    expect(text).toBe('3 pontos para conferir');
  });
});

describe('sync history', () => {
  it('should_call_the_scheduled_run_agendada', () => {
    // Arrange & Act
    const label = describeSyncTrigger('schedule');
    // Assert
    expect(label).toBe('Agendada');
  });

  it('should_call_the_manual_run_botao', () => {
    // Arrange & Act
    const label = describeSyncTrigger('manual');
    // Assert
    expect(label).toBe('Botão');
  });

  it('should_describe_a_partial_run_with_text', () => {
    // Arrange & Act
    const result = syncResultOf('partial');
    // Assert
    expect(result.label).toBe('Parcial');
  });

  it('should_describe_the_counts_of_new_and_updated_transactions', () => {
    // Arrange & Act
    const text = describeSyncCounts({ transactionsInserted: 12, transactionsUpdated: 1 });
    // Assert
    expect(text).toBe('12 novas, 1 atualizada');
  });

  it('should_capitalize_the_moment_of_the_run', () => {
    // Arrange
    const now = new Date('2026-11-24T15:00:00Z');
    // Act
    const text = describeSyncMoment('2026-11-24T10:02:00.000Z', now);
    // Assert
    expect(text).toBe('Hoje, 07:02');
  });

  it('should_join_the_trigger_and_the_counts', () => {
    // Arrange
    const run = {
      id: '99999999-9999-4999-8999-999999999999',
      trigger: 'manual' as const,
      status: 'success' as const,
      startedAt: '2026-11-24T10:00:00.000Z',
      finishedAt: '2026-11-24T10:02:00.000Z',
      stats: { transactionsInserted: 12, transactionsUpdated: 3 },
      errorMessage: null,
    };
    // Act
    const text = describeSyncRun(run);
    // Assert
    expect(text).toBe('Botão · 12 novas, 3 atualizadas');
  });

  it('should_return_null_when_the_run_has_no_counts', () => {
    // Arrange & Act
    const text = describeSyncCounts(null);
    // Assert
    expect(text).toBeNull();
  });
});
