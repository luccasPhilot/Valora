import { partialMatchKey, type QueryKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { type DataChange, invalidationsAfter, queryKeys } from './query-keys';

/** As chaves invalidadas, pelo primeiro termo, em ordem alfabética: compara conjuntos, não ordem. */
function invalidatedNames(change: DataChange): string[] {
  return invalidationsAfter(change)
    .map((queryKey) => String(queryKey[0]))
    .sort();
}

/** Se a consulta com esta chave fica desatualizada depois da mudança (casa pelo prefixo). */
function isInvalidated(change: DataChange, queryKey: QueryKey): boolean {
  return invalidationsAfter(change).some((prefix) => partialMatchKey(queryKey, prefix));
}

const TRANSACTION_CHANGE_KEYS = [
  'alerts',
  'budgets',
  'credit-card-bills',
  'dashboard',
  'planned-entries',
  'possible-duplicate-count',
  'projection',
  'reports',
  'transaction-detail',
  'transaction-summary',
  'transactions',
];

describe('invalidationsAfter', () => {
  it('should_refresh_lists_totals_home_reports_alerts_planning_and_bills_when_transactions_change', () => {
    // Arrange
    const change = 'transactions';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(TRANSACTION_CHANGE_KEYS);
  });

  it('should_refresh_the_list_the_summary_the_reports_and_the_tags_when_a_note_or_tag_changes', () => {
    // Arrange
    const change = 'transaction-annotations';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual([
      'reports',
      'tags',
      'transaction-detail',
      'transaction-summary',
      'transactions',
    ]);
  });

  it('should_not_refresh_budgets_or_home_when_a_note_or_tag_changes', () => {
    // Arrange
    const screens = [queryKeys.budgets, queryKeys.dashboard];
    // Act
    const stale = screens.map((queryKey) => isInvalidated('transaction-annotations', queryKey));
    // Assert
    expect(stale).toEqual([false, false]);
  });

  it('should_refresh_budgets_home_reports_alerts_and_summary_when_one_category_changes', () => {
    // Arrange
    const change = 'transaction-category';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual([
      'alerts',
      'budgets',
      'category-rules',
      'dashboard',
      'reports',
      'review-count',
      'transaction-summary',
      'transactions',
    ]);
  });

  it('should_refresh_the_inbox_the_counter_and_suggestions_but_not_the_list_when_one_category_changes', () => {
    // Arrange
    const queries = [
      queryKeys.reviewInbox,
      queryKeys.reviewCount,
      queryKeys.ruleSuggestions,
      [...queryKeys.transactions, { from: '2026-11-01', to: '2026-11-30' }],
    ];
    // Act
    const stale = queries.map((queryKey) => isInvalidated('transaction-category', queryKey));
    // Assert
    expect(stale).toEqual([true, true, true, false]);
  });

  it('should_refresh_every_list_when_categories_change_in_bulk', () => {
    // Arrange
    const list = [...queryKeys.transactions, { from: '2026-11-01', to: '2026-11-30' }];
    // Act
    const isStale = isInvalidated('transaction-categories', list);
    // Assert
    expect(isStale).toBe(true);
  });

  it('should_refresh_only_the_inbox_the_counter_and_home_when_transactions_are_reviewed', () => {
    // Arrange
    const queries = [
      queryKeys.reviewInbox,
      queryKeys.reviewCount,
      queryKeys.dashboard,
      [...queryKeys.transactions, { from: '2026-11-01', to: '2026-11-30' }],
      queryKeys.budgets,
    ];
    // Act
    const stale = queries.map((queryKey) => isInvalidated('transaction-review', queryKey));
    // Assert
    expect(stale).toEqual([true, true, true, false, false]);
  });

  it('should_refresh_suggestions_when_a_rule_is_saved', () => {
    // Arrange
    // Act
    const isStale = isInvalidated('categorization', queryKeys.ruleSuggestions);
    // Assert
    expect(isStale).toBe(true);
  });

  it('should_refresh_everything_a_transaction_change_does_plus_rules_and_mappings_when_categorization_changes', () => {
    // Arrange
    const change = 'categorization';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(
      [...TRANSACTION_CHANGE_KEYS, 'category-rules', 'pluggy-category-mappings'].sort(),
    );
  });

  it('should_refresh_home_budgets_reports_analysis_and_alerts_when_categorization_changes', () => {
    // Arrange
    const screens = [
      queryKeys.dashboard,
      [...queryKeys.budgets, '2026-11'],
      [...queryKeys.reports, 'income-expense', '2025-12', '2026-11'],
      [...queryKeys.categoryInsights, '2026-11'],
      queryKeys.alerts,
    ];
    // Act
    const stale = screens.map((queryKey) => isInvalidated('categorization', queryKey));
    // Assert
    expect(stale).toEqual([true, true, true, true, true]);
  });

  it('should_refresh_categories_list_budgets_home_and_reports_when_categories_change', () => {
    // Arrange
    const change = 'categories';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['budgets', 'categories', 'dashboard', 'reports', 'transactions']);
  });

  it('should_refresh_budgets_home_and_alerts_when_budgets_change', () => {
    // Arrange
    const change = 'budgets';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['alerts', 'budgets', 'dashboard']);
  });

  it('should_refresh_goals_and_home_when_goals_change', () => {
    // Arrange
    const change = 'goals';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['dashboard', 'goals']);
  });

  it('should_refresh_planned_entries_projection_and_home_when_planned_entries_change', () => {
    // Arrange
    const change = 'planned-entries';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['dashboard', 'planned-entries', 'projection']);
  });

  it('should_refresh_investments_net_worth_home_and_goals_when_investments_change', () => {
    // Arrange
    const change = 'investments';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['dashboard', 'goals', 'investments', 'net-worth']);
  });

  it('should_refresh_accounts_home_net_worth_projection_and_data_health_when_accounts_change', () => {
    // Arrange
    const change = 'accounts';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['accounts', 'dashboard', 'data-health', 'net-worth', 'projection']);
  });

  it('should_refresh_only_the_alerts_when_an_alert_is_read_or_dismissed', () => {
    // Arrange
    const change = 'alerts';
    // Act
    const names = invalidatedNames(change);
    // Assert
    expect(names).toEqual(['alerts']);
  });

  it('should_refresh_the_net_worth_report_when_accounts_change', () => {
    // Arrange
    const netWorthReport = [...queryKeys.netWorth, 'report', '2025-12', '2026-11'];
    // Act
    const isStale = isInvalidated('accounts', netWorthReport);
    // Assert
    expect(isStale).toBe(true);
  });
});
