import { describe, expect, it } from 'vitest';

import { compileRules, type RuleInput } from '../../../src/modules/categories/category-decision.js';
import {
  chooseRuleSuggestions,
  type CorrectionGroup,
  MAX_RULE_SUGGESTIONS,
} from '../../../src/modules/categories/rule-suggestions.js';

const TRANSPORT_ID = 'a1a1a1a1-0000-4000-8000-000000000001';
const GROCERIES_ID = 'a1a1a1a1-0000-4000-8000-000000000002';

function group(overrides: Partial<CorrectionGroup> = {}): CorrectionGroup {
  return {
    pattern: 'UBER *TRIP',
    categoryId: TRANSPORT_ID,
    categoryName: 'Transporte',
    categoryIcon: 'car',
    isCategoryArchived: false,
    correctionCount: 2,
    ...overrides,
  };
}

function rule(overrides: Partial<RuleInput>): RuleInput {
  return {
    id: 'b2b2b2b2-0000-4000-8000-000000000001',
    pattern: 'UBER',
    matchType: 'contains',
    categoryId: TRANSPORT_ID,
    priority: 0,
    createdAt: new Date('2026-11-01T12:00:00Z'),
    ...overrides,
  };
}

function patternsOf(groups: readonly CorrectionGroup[], rules: readonly RuleInput[] = []) {
  return chooseRuleSuggestions({ groups, rules: compileRules(rules), dismissedPairs: [] }).map(
    (suggestion) => suggestion.pattern,
  );
}

describe('chooseRuleSuggestions', () => {
  it('should_suggest_the_pair_when_there_are_two_corrections', () => {
    // Arrange
    const groups = [group({ correctionCount: 2 })];
    // Act
    const suggestions = chooseRuleSuggestions({ groups, rules: [], dismissedPairs: [] });
    // Assert
    expect(suggestions).toEqual([
      {
        pattern: 'UBER *TRIP',
        categoryId: TRANSPORT_ID,
        categoryName: 'Transporte',
        categoryIcon: 'car',
        correctionCount: 2,
      },
    ]);
  });

  it('should_not_suggest_when_there_is_a_single_correction', () => {
    // Arrange
    const groups = [group({ correctionCount: 1 })];
    // Act
    const patterns = patternsOf(groups);
    // Assert
    expect(patterns).toEqual([]);
  });

  it('should_not_suggest_when_a_current_rule_already_decides_the_category', () => {
    // Arrange
    const groups = [group()];
    // Act
    const patterns = patternsOf(groups, [rule({ pattern: 'uber', matchType: 'contains' })]);
    // Assert
    expect(patterns).toEqual([]);
  });

  it('should_suggest_when_the_matching_rule_points_to_another_category', () => {
    // Arrange
    const groups = [group()];
    // Act
    const patterns = patternsOf(groups, [rule({ categoryId: GROCERIES_ID })]);
    // Assert
    expect(patterns).toEqual(['UBER *TRIP']);
  });

  it('should_not_suggest_when_the_pair_was_dismissed', () => {
    // Arrange
    const groups = [group({ correctionCount: 3 })];
    // Act
    const suggestions = chooseRuleSuggestions({
      groups,
      rules: [],
      dismissedPairs: [{ pattern: 'UBER *TRIP', categoryId: TRANSPORT_ID }],
    });
    // Assert
    expect(suggestions).toEqual([]);
  });

  it('should_still_suggest_another_category_when_only_one_pair_was_dismissed', () => {
    // Arrange
    const groups = [group({ categoryId: GROCERIES_ID })];
    // Act
    const suggestions = chooseRuleSuggestions({
      groups,
      rules: [],
      dismissedPairs: [{ pattern: 'UBER *TRIP', categoryId: TRANSPORT_ID }],
    });
    // Assert
    expect(suggestions.map((suggestion) => suggestion.categoryId)).toEqual([GROCERIES_ID]);
  });

  it('should_not_suggest_when_the_category_is_archived', () => {
    // Arrange
    const groups = [group({ isCategoryArchived: true })];
    // Act
    const patterns = patternsOf(groups);
    // Assert
    expect(patterns).toEqual([]);
  });

  it('should_not_suggest_when_the_pattern_is_longer_than_a_rule_accepts', () => {
    // Arrange
    const groups = [group({ pattern: 'X'.repeat(121) })];
    // Act
    const patterns = patternsOf(groups);
    // Assert
    expect(patterns).toEqual([]);
  });

  it('should_order_by_correction_count_then_pattern_when_there_are_several', () => {
    // Arrange
    const groups = [
      group({ pattern: 'PADARIA', correctionCount: 2 }),
      group({ pattern: 'IFOOD', correctionCount: 5 }),
      group({ pattern: 'AMAZON', correctionCount: 2 }),
    ];
    // Act
    const patterns = patternsOf(groups);
    // Assert
    expect(patterns).toEqual(['IFOOD', 'AMAZON', 'PADARIA']);
  });

  it('should_return_at_most_20_when_there_are_more_suggestions', () => {
    // Arrange
    const groups = Array.from({ length: 25 }, (_, index) =>
      group({ pattern: `LOJA ${String(index).padStart(2, '0')}` }),
    );
    // Act
    const patterns = patternsOf(groups);
    // Assert
    expect(patterns).toHaveLength(MAX_RULE_SUGGESTIONS);
  });
});
