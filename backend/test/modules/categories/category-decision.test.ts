import { describe, expect, it } from 'vitest';

import {
  type CategorizableTransaction,
  type CategorySource,
  compileRules,
  decideCategory,
  type MatchType,
  type RuleInput,
} from '../../../src/modules/categories/category-decision.js';

const TRANSPORT = 'category-transport';
const FOOD = 'category-food';
const GROCERIES = 'category-groceries';
const SHOPPING = 'category-shopping';
const SUBSCRIPTIONS = 'category-subscriptions';
const LEISURE = 'category-leisure';
const NO_MAPPINGS: ReadonlyMap<string, string> = new Map();

function transaction(overrides: Partial<CategorizableTransaction> = {}): CategorizableTransaction {
  return {
    descriptionNormalized: 'UBER *TRIP 4521',
    pluggyCategory: null,
    categoryId: null,
    categorySource: 'none',
    ...overrides,
  };
}

function rule(overrides: Partial<RuleInput> & Pick<RuleInput, 'pattern'>): RuleInput {
  return {
    id: crypto.randomUUID(),
    matchType: 'contains',
    categoryId: TRANSPORT,
    priority: 0,
    createdAt: new Date('2026-11-01T12:00:00Z'),
    ...overrides,
  };
}

function decide(
  subject: CategorizableTransaction,
  rules: readonly RuleInput[],
  mappings: ReadonlyMap<string, string> = NO_MAPPINGS,
) {
  return decideCategory(subject, compileRules(rules), mappings);
}

describe('decideCategory: tipos de comparação', () => {
  it.each<{ matchType: MatchType; pattern: string; description: string }>([
    { matchType: 'contains', pattern: 'UBER', description: 'PAGAMENTO UBER *TRIP' },
    { matchType: 'starts_with', pattern: 'UBER', description: 'UBER *TRIP 4521' },
    { matchType: 'equals', pattern: 'UBER *TRIP 4521', description: 'UBER *TRIP 4521' },
  ])('should_apply_the_rule_when_$matchType_matches', ({ matchType, pattern, description }) => {
    // Arrange
    const rules = [rule({ pattern, matchType })];
    // Act
    const decision = decide(transaction({ descriptionNormalized: description }), rules);
    // Assert
    expect(decision).toEqual({ categoryId: TRANSPORT, source: 'rule' });
  });

  it.each<{ matchType: MatchType; pattern: string }>([
    { matchType: 'contains', pattern: 'IFOOD' },
    { matchType: 'starts_with', pattern: 'TRIP' },
    { matchType: 'equals', pattern: 'UBER' },
  ])('should_not_apply_the_rule_when_$matchType_does_not_match', ({ matchType, pattern }) => {
    // Arrange
    const rules = [rule({ pattern, matchType })];
    // Act
    const decision = decide(transaction(), rules);
    // Assert
    expect(decision).toEqual({ categoryId: null, source: 'none' });
  });

  it('should_apply_the_rule_when_the_pattern_has_accents_and_lower_case', () => {
    // Arrange
    const rules = [rule({ pattern: '  Farmácia ', matchType: 'starts_with', categoryId: FOOD })];
    // Act
    const decision = decide(transaction({ descriptionNormalized: 'FARMACIA SAO JOAO' }), rules);
    // Assert
    expect(decision).toEqual({ categoryId: FOOD, source: 'rule' });
  });

  it('should_ignore_the_rule_when_the_pattern_is_empty_after_normalization', () => {
    // Arrange
    const rules = [rule({ pattern: '   ' })];
    // Act
    const decision = decide(transaction(), rules);
    // Assert
    expect(decision).toEqual({ categoryId: null, source: 'none' });
  });
});

describe('decideCategory: prioridade', () => {
  it('should_choose_the_higher_priority_rule_when_two_rules_match', () => {
    // Arrange
    const rules = [
      rule({ pattern: 'UBER', priority: 1, categoryId: TRANSPORT }),
      rule({ pattern: 'UBER EATS', priority: 2, categoryId: FOOD }),
    ];
    // Act
    const decision = decide(transaction({ descriptionNormalized: 'UBER EATS 123' }), rules);
    // Assert
    expect(decision.categoryId).toBe(FOOD);
  });

  it('should_choose_the_most_recent_rule_when_priorities_tie', () => {
    // Arrange
    const rules = [
      rule({ pattern: 'UBER', categoryId: TRANSPORT, createdAt: new Date('2026-11-01T10:00:00Z') }),
      rule({ pattern: 'UBER', categoryId: FOOD, createdAt: new Date('2026-11-02T10:00:00Z') }),
    ];
    // Act
    const decision = decide(transaction(), rules);
    // Assert
    expect(decision.categoryId).toBe(FOOD);
  });
});

describe('decideCategory: ordem de decisão', () => {
  it('should_use_the_rule_when_the_pluggy_category_is_also_mapped', () => {
    // Arrange
    const rules = [rule({ pattern: 'NETFLIX', categoryId: SUBSCRIPTIONS })];
    const mappings = new Map([['Shopping', SHOPPING]]);
    const subject = transaction({
      descriptionNormalized: 'NETFLIX.COM',
      pluggyCategory: 'Shopping',
    });
    // Act
    const decision = decide(subject, rules, mappings);
    // Assert
    expect(decision).toEqual({ categoryId: SUBSCRIPTIONS, source: 'rule' });
  });

  it('should_keep_the_user_choice_when_a_rule_matches', () => {
    // Arrange
    const rules = [rule({ pattern: 'UBER', categoryId: SHOPPING })];
    const subject = transaction({ categoryId: LEISURE, categorySource: 'user' });
    // Act
    const decision = decide(subject, rules);
    // Assert
    expect(decision).toEqual({ categoryId: LEISURE, source: 'user' });
  });

  it('should_use_the_pluggy_mapping_when_no_rule_matches', () => {
    // Arrange
    const mappings = new Map([['Groceries', GROCERIES]]);
    const subject = transaction({
      descriptionNormalized: 'MERCADO X',
      pluggyCategory: 'Groceries',
    });
    // Act
    const decision = decide(subject, [], mappings);
    // Assert
    expect(decision).toEqual({ categoryId: GROCERIES, source: 'pluggy' });
  });

  it.each<{ pluggyCategory: string | null }>([
    { pluggyCategory: 'Unmapped' },
    { pluggyCategory: null },
  ])(
    'should_leave_the_transaction_without_category_when_pluggy_category_is_$pluggyCategory',
    ({ pluggyCategory }) => {
      // Arrange
      const mappings = new Map([['Groceries', GROCERIES]]);
      const subject = transaction({
        pluggyCategory,
        categoryId: GROCERIES,
        categorySource: 'pluggy',
      });
      // Act
      const decision = decide(subject, [], mappings);
      // Assert
      expect(decision).toEqual({ categoryId: null, source: 'none' });
    },
  );

  it.each<CategorySource>(['none', 'pluggy', 'rule'])(
    'should_recategorize_when_the_current_source_is_%s',
    (categorySource) => {
      // Arrange
      const rules = [rule({ pattern: 'UBER' })];
      // Act
      const decision = decide(transaction({ categorySource, categoryId: FOOD }), rules);
      // Assert
      expect(decision).toEqual({ categoryId: TRANSPORT, source: 'rule' });
    },
  );
});
