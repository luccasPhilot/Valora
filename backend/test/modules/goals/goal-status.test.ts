import { describe, expect, it } from 'vitest';

import type { GoalPaceEstimate } from '../../../src/modules/goals/goal-pace.js';
import { goalStatus, type StatusGoal } from '../../../src/modules/goals/goal-status.js';

const TODAY = '2026-11-15';

function goal(overrides: Partial<StatusGoal> = {}): StatusGoal {
  return { savedCents: 700000, targetCents: 1000000, targetDate: null, ...overrides };
}

function paceOf(overrides: Partial<GoalPaceEstimate> = {}): GoalPaceEstimate {
  return {
    monthlyRateCents: 50000,
    windowDays: 90,
    monthsToGo: 6,
    estimatedDate: '2027-05-15',
    isEstimateTooFar: false,
    ...overrides,
  };
}

const NO_PACE = paceOf({ monthlyRateCents: 0, monthsToGo: null, estimatedDate: null });

describe('goalStatus', () => {
  it('should_be_completed_when_saved_reaches_the_target', () => {
    // Arrange
    const reachedGoal = goal({ savedCents: 1000000 });
    // Act
    const situation = goalStatus(reachedGoal, NO_PACE, TODAY);
    // Assert
    expect(situation.status).toBe('completed');
  });

  it('should_be_completed_when_the_deadline_has_passed_but_the_target_was_reached', () => {
    // Arrange
    const reachedGoal = goal({ savedCents: 1200000, targetDate: '2026-01-01' });
    // Act
    const situation = goalStatus(reachedGoal, NO_PACE, TODAY);
    // Assert
    expect(situation.status).toBe('completed');
  });

  it('should_have_no_required_amount_when_completed', () => {
    // Arrange
    const reachedGoal = goal({ savedCents: 1000000, targetDate: '2027-05-15' });
    // Act
    const situation = goalStatus(reachedGoal, NO_PACE, TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBeNull();
  });

  it('should_report_the_remaining_amount_when_not_completed', () => {
    // Arrange
    const pendingGoal = goal();
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.remainingCents).toBe(300000);
  });

  it('should_be_no_pace_when_the_rate_is_zero', () => {
    // Arrange
    const pendingGoal = goal();
    // Act
    const situation = goalStatus(pendingGoal, NO_PACE, TODAY);
    // Assert
    expect(situation.status).toBe('no_pace');
  });

  it('should_be_on_track_when_there_is_pace_and_no_deadline', () => {
    // Arrange
    const pendingGoal = goal();
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.status).toBe('on_track');
  });

  it('should_be_on_track_when_the_estimate_is_before_the_deadline', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: '2027-07-15' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.status).toBe('on_track');
  });

  it('should_be_on_track_when_the_estimate_is_exactly_the_deadline', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: '2027-05-15' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.status).toBe('on_track');
  });

  it('should_be_behind_when_the_estimate_is_one_day_after_the_deadline', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: '2027-05-14' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.status).toBe('behind');
  });

  it('should_be_behind_when_the_estimate_is_too_far_and_there_is_a_deadline', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: '2030-01-01' });
    const farPace = paceOf({ monthsToGo: null, estimatedDate: null, isEstimateTooFar: true });
    // Act
    const situation = goalStatus(pendingGoal, farPace, TODAY);
    // Assert
    expect(situation.status).toBe('behind');
  });

  it('should_be_behind_when_the_deadline_has_passed_and_the_target_was_not_reached', () => {
    // Arrange
    const overdueGoal = goal({ targetDate: '2026-11-14' });
    // Act
    const situation = goalStatus(overdueGoal, paceOf(), TODAY);
    // Assert
    expect(situation.status).toBe('behind');
  });

  it('should_be_behind_instead_of_no_pace_when_the_deadline_has_passed', () => {
    // Arrange
    const overdueGoal = goal({ targetDate: '2026-11-14' });
    // Act
    const situation = goalStatus(overdueGoal, NO_PACE, TODAY);
    // Assert
    expect(situation.status).toBe('behind');
  });

  it('should_not_be_overdue_when_the_deadline_is_today', () => {
    // Arrange
    const dueTodayGoal = goal({ targetDate: TODAY });
    // Act
    const situation = goalStatus(dueTodayGoal, NO_PACE, TODAY);
    // Assert
    expect(situation.status).toBe('no_pace');
  });

  it('should_require_remaining_over_months_to_deadline_when_there_is_a_deadline', () => {
    // Arrange
    const pendingGoal = goal({ savedCents: 700000, targetDate: '2027-05-15' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBe(50000);
  });

  it('should_round_the_required_amount_up_when_it_is_not_exact', () => {
    // Arrange
    const pendingGoal = goal({ savedCents: 899999, targetDate: '2027-01-15' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBe(50001);
  });

  it('should_count_a_partial_month_as_a_full_month_when_computing_the_required_amount', () => {
    // Arrange
    const pendingGoal = goal({ savedCents: 700000, targetDate: '2026-12-16' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBe(150000);
  });

  it('should_require_the_whole_remaining_amount_when_the_deadline_is_within_a_month', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: '2026-11-20' });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBe(300000);
  });

  it('should_require_the_whole_remaining_amount_when_the_deadline_is_today', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: TODAY });
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBe(300000);
  });

  it('should_require_the_whole_remaining_amount_when_the_deadline_has_passed', () => {
    // Arrange
    const overdueGoal = goal({ targetDate: '2026-01-01' });
    // Act
    const situation = goalStatus(overdueGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBe(300000);
  });

  it('should_have_no_required_amount_when_there_is_no_deadline', () => {
    // Arrange
    const pendingGoal = goal();
    // Act
    const situation = goalStatus(pendingGoal, paceOf(), TODAY);
    // Assert
    expect(situation.requiredMonthlyCents).toBeNull();
  });

  it('should_still_require_an_amount_when_there_is_no_pace_and_a_future_deadline', () => {
    // Arrange
    const pendingGoal = goal({ targetDate: '2027-05-15' });
    // Act
    const situation = goalStatus(pendingGoal, NO_PACE, TODAY);
    // Assert
    expect(situation).toMatchObject({ status: 'no_pace', requiredMonthlyCents: 50000 });
  });
});
