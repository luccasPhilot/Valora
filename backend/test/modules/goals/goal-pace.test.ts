import { describe, expect, it } from 'vitest';

import {
  estimateGoalPace,
  type PaceContribution,
  type PaceGoal,
} from '../../../src/modules/goals/goal-pace.js';

const TODAY = '2026-11-15';
const OLD_GOAL_DATE = '2026-01-01';

function goal(overrides: Partial<PaceGoal> = {}): PaceGoal {
  return {
    savedCents: 90000,
    targetCents: 390000,
    createdDate: OLD_GOAL_DATE,
    ...overrides,
  };
}

function deposit(amountCents: number, date: string): PaceContribution {
  return { date, amountCents, kind: 'deposit' };
}

describe('estimateGoalPace', () => {
  it('should_average_the_net_contributions_per_month_when_the_goal_is_older_than_90_days', () => {
    // Arrange
    const contributions = [deposit(90000, '2026-10-01')];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(30000);
  });

  it('should_estimate_ceil_of_remaining_over_rate_months_when_there_is_pace', () => {
    // Arrange
    const contributions = [deposit(90000, '2026-10-01')];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthsToGo).toBe(10);
  });

  it('should_estimate_the_date_counting_months_from_today_when_there_is_pace', () => {
    // Arrange
    const contributions = [deposit(90000, '2026-10-01')];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.estimatedDate).toBe('2027-09-15');
  });

  it('should_have_no_pace_when_only_the_initial_value_exists', () => {
    // Arrange
    const contributions: PaceContribution[] = [
      { date: '2026-11-10', amountCents: 150000, kind: 'initial' },
    ];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_have_no_estimate_when_there_is_no_pace', () => {
    // Arrange
    const contributions: PaceContribution[] = [];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace).toMatchObject({ monthsToGo: null, estimatedDate: null, isEstimateTooFar: false });
  });

  it('should_have_no_pace_when_withdrawals_exceed_deposits', () => {
    // Arrange
    const contributions: PaceContribution[] = [
      deposit(50000, '2026-10-01'),
      { date: '2026-10-20', amountCents: -80000, kind: 'withdrawal' },
    ];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_use_the_minimum_30_day_window_when_the_goal_is_10_days_old', () => {
    // Arrange
    const newGoal = goal({ createdDate: '2026-11-05' });
    const contributions = [deposit(30000, '2026-11-10')];
    // Act
    const pace = estimateGoalPace(newGoal, contributions, TODAY);
    // Assert
    expect(pace).toMatchObject({ windowDays: 30, monthlyRateCents: 30000 });
  });

  it('should_use_the_goal_age_as_window_when_it_is_between_30_and_90_days_old', () => {
    // Arrange
    const newGoal = goal({ createdDate: '2026-09-16' });
    const contributions = [deposit(60000, '2026-10-20')];
    // Act
    const pace = estimateGoalPace(newGoal, contributions, TODAY);
    // Assert
    expect(pace).toMatchObject({ windowDays: 60, monthlyRateCents: 30000 });
  });

  it('should_ignore_contributions_older_than_the_window_when_computing_the_rate', () => {
    // Arrange
    const contributions = [deposit(90000, '2026-08-17')];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(0);
  });

  it('should_count_the_oldest_day_of_the_window_when_computing_the_rate', () => {
    // Arrange
    const contributions = [deposit(90000, '2026-08-18')];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(30000);
  });

  it('should_round_the_rate_down_when_it_has_a_fraction_of_a_cent', () => {
    // Arrange
    const contributions = [deposit(100, '2026-11-01')];
    // Act
    const pace = estimateGoalPace(goal(), contributions, TODAY);
    // Assert
    expect(pace.monthlyRateCents).toBe(33);
  });

  it('should_return_the_estimate_when_it_is_exactly_600_months', () => {
    // Arrange
    const contributions = [deposit(300, '2026-11-01')];
    const farGoal = goal({ savedCents: 0, targetCents: 60000 });
    // Act
    const pace = estimateGoalPace(farGoal, contributions, TODAY);
    // Assert
    expect(pace).toMatchObject({ monthsToGo: 600, isEstimateTooFar: false });
  });

  it('should_return_no_date_when_the_estimate_passes_600_months', () => {
    // Arrange
    const contributions = [deposit(300, '2026-11-01')];
    const farGoal = goal({ savedCents: 0, targetCents: 60001 });
    // Act
    const pace = estimateGoalPace(farGoal, contributions, TODAY);
    // Assert
    expect(pace).toMatchObject({ monthsToGo: null, estimatedDate: null, isEstimateTooFar: true });
  });

  it('should_have_no_estimate_when_the_goal_is_already_completed', () => {
    // Arrange
    const contributions = [deposit(90000, '2026-10-01')];
    const completedGoal = goal({ savedCents: 390000 });
    // Act
    const pace = estimateGoalPace(completedGoal, contributions, TODAY);
    // Assert
    expect(pace).toMatchObject({ monthsToGo: null, estimatedDate: null, isEstimateTooFar: false });
  });
});
