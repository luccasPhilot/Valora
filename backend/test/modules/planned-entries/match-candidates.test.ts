import { describe, expect, it } from 'vitest';

import {
  type CandidateTransaction,
  rankMatchCandidates,
} from '../../../src/modules/planned-entries/match-candidates.js';

const RENT_CATEGORY = 'category-rent';
const OTHER_CATEGORY = 'category-other';

// Aluguel previsto: R$ 1.000,00 de despesa no dia 10.
const OCCURRENCE = { date: '2026-12-10', amountCents: -100000, categoryId: RENT_CATEGORY };

function transaction(overrides: Partial<CandidateTransaction> = {}): CandidateTransaction {
  return {
    id: 'tx-1',
    date: '2026-12-10',
    amountCents: -100000,
    categoryId: RENT_CATEGORY,
    isLinked: false,
    ...overrides,
  };
}

function idsOf(transactions: readonly CandidateTransaction[]): string[] {
  return rankMatchCandidates(OCCURRENCE, transactions).map((candidate) => candidate.id);
}

describe('rankMatchCandidates value tolerance', () => {
  it('should_accept_a_value_exactly_20_percent_away_when_the_category_differs', () => {
    // Arrange
    const candidate = transaction({ amountCents: -120000, categoryId: OTHER_CATEGORY });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual(['tx-1']);
  });

  it('should_reject_a_value_20_01_percent_away_when_the_category_differs', () => {
    // Arrange
    const candidate = transaction({ amountCents: -120010, categoryId: OTHER_CATEGORY });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual([]);
  });

  it('should_accept_any_value_when_the_category_is_the_same', () => {
    // Arrange
    const candidate = transaction({ amountCents: -5000 });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual(['tx-1']);
  });

  it('should_accept_a_value_below_the_planned_one_when_it_is_within_20_percent', () => {
    // Arrange
    const candidate = transaction({ amountCents: -80000, categoryId: OTHER_CATEGORY });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual(['tx-1']);
  });
});

describe('rankMatchCandidates date window', () => {
  it('should_accept_a_transaction_7_days_away_when_everything_else_matches', () => {
    // Arrange
    const candidate = transaction({ date: '2026-12-17' });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual(['tx-1']);
  });

  it('should_reject_a_transaction_8_days_away_when_everything_else_matches', () => {
    // Arrange
    const candidate = transaction({ date: '2026-12-18' });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual([]);
  });

  it('should_reject_a_transaction_from_another_month_when_it_is_within_7_days', () => {
    // Arrange
    const earlyDecember = { ...OCCURRENCE, date: '2026-12-02' };
    const lateNovember = transaction({ date: '2026-11-30' });
    // Act
    const candidates = rankMatchCandidates(earlyDecember, [lateNovember]);
    // Assert
    expect(candidates).toEqual([]);
  });
});

describe('rankMatchCandidates sign and links', () => {
  it('should_reject_an_income_when_the_planned_entry_is_an_expense', () => {
    // Arrange
    const candidate = transaction({ amountCents: 100000 });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual([]);
  });

  it('should_reject_a_transaction_already_linked_to_another_occurrence', () => {
    // Arrange
    const candidate = transaction({ isLinked: true });
    // Act
    const ids = idsOf([candidate]);
    // Assert
    expect(ids).toEqual([]);
  });
});

describe('rankMatchCandidates ordering', () => {
  it('should_put_the_closest_value_first_when_there_are_several_candidates', () => {
    // Arrange
    const far = transaction({ id: 'far', amountCents: -90000 });
    const close = transaction({ id: 'close', amountCents: -99000 });
    // Act
    const ids = idsOf([far, close]);
    // Assert
    expect(ids).toEqual(['close', 'far']);
  });

  it('should_put_the_closest_date_first_when_the_values_tie', () => {
    // Arrange
    const later = transaction({ id: 'later', date: '2026-12-14' });
    const sooner = transaction({ id: 'sooner', date: '2026-12-11' });
    // Act
    const ids = idsOf([later, sooner]);
    // Assert
    expect(ids).toEqual(['sooner', 'later']);
  });

  it('should_return_at_most_five_candidates_when_there_are_more', () => {
    // Arrange
    const many = Array.from({ length: 8 }, (_, index) =>
      transaction({ id: `tx-${String(index)}` }),
    );
    // Act
    const ids = idsOf(many);
    // Assert
    expect(ids).toHaveLength(5);
  });
});
