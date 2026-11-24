import { describe, expect, it } from 'vitest';

import {
  matchVanishedPending,
  type ReplacementTransaction,
} from '../../../src/modules/sync/pending-replacement.js';

const AMOUNT_CENTS = -8990;
const PENDING_CREATED_AT = new Date('2026-11-10T10:00:00Z');
const POSTED_CREATED_AT = new Date('2026-11-12T10:00:00Z');
const TODAY = '2026-11-12';

function pending(overrides: Partial<ReplacementTransaction> = {}): ReplacementTransaction {
  return {
    id: 'pending-1',
    date: '2026-11-10',
    amountCents: AMOUNT_CENTS,
    createdAt: PENDING_CREATED_AT,
    ...overrides,
  };
}

function posted(
  id: string,
  overrides: Partial<ReplacementTransaction> = {},
): ReplacementTransaction {
  return {
    id,
    date: '2026-11-11',
    amountCents: AMOUNT_CENTS,
    createdAt: POSTED_CREATED_AT,
    ...overrides,
  };
}

describe('matchVanishedPending', () => {
  it('should_carry_the_decision_when_there_is_one_candidate', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1')],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan).toEqual({
      replacements: [{ pendingId: 'pending-1', postedId: 'posted-1' }],
      keptPendingIds: [],
      ties: 0,
    });
  });

  it('should_keep_the_pending_when_there_is_no_candidate', () => {
    // Arrange
    const input = { vanishedPendings: [pending()], postedCandidates: [], today: TODAY };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan).toEqual({ replacements: [], keptPendingIds: ['pending-1'], ties: 0 });
  });

  it('should_carry_nothing_and_count_a_tie_when_two_candidates_are_at_the_same_distance', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1'), posted('posted-2')],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan).toEqual({ replacements: [], keptPendingIds: ['pending-1'], ties: 1 });
  });

  it('should_choose_the_closest_date_when_two_candidates_are_at_different_distances', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-far', { date: '2026-11-13' }), posted('posted-near')],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toEqual([{ pendingId: 'pending-1', postedId: 'posted-near' }]);
  });

  it('should_accept_a_candidate_one_day_before_the_pending', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1', { date: '2026-11-09' })],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toHaveLength(1);
  });

  it('should_accept_a_candidate_five_days_after_the_pending', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1', { date: '2026-11-15' })],
      today: '2026-11-15',
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toHaveLength(1);
  });

  it('should_ignore_a_candidate_two_days_before_the_pending', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1', { date: '2026-11-08' })],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toEqual([]);
  });

  it('should_ignore_a_candidate_six_days_after_the_pending', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1', { date: '2026-11-16' })],
      today: '2026-11-16',
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toEqual([]);
  });

  it('should_ignore_a_candidate_with_another_amount', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1', { amountCents: -9050 })],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toEqual([]);
  });

  it('should_ignore_a_candidate_saved_before_the_pending', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending()],
      postedCandidates: [posted('posted-1', { createdAt: new Date('2026-11-01T10:00:00Z') })],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.replacements).toEqual([]);
  });

  it('should_give_one_posted_to_only_one_pending_when_two_pendings_match_it', () => {
    // Arrange
    const input = {
      vanishedPendings: [pending({ id: 'pending-2' }), pending({ id: 'pending-1' })],
      postedCandidates: [posted('posted-1')],
      today: TODAY,
    };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan).toEqual({
      replacements: [{ pendingId: 'pending-1', postedId: 'posted-1' }],
      keptPendingIds: ['pending-2'],
      ties: 0,
    });
  });

  it('should_keep_the_pending_on_the_fifth_day_after_its_date', () => {
    // Arrange
    const input = { vanishedPendings: [pending()], postedCandidates: [], today: '2026-11-15' };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.keptPendingIds).toEqual(['pending-1']);
  });

  it('should_let_the_pending_go_on_the_sixth_day_after_its_date', () => {
    // Arrange
    const input = { vanishedPendings: [pending()], postedCandidates: [], today: '2026-11-16' };
    // Act
    const plan = matchVanishedPending(input);
    // Assert
    expect(plan.keptPendingIds).toEqual([]);
  });
});
