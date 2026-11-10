import { describe, expect, it } from 'vitest';

import {
  GOAL_MESSAGES,
  type GoalFormValues,
  newGoalValues,
  toGoalInput,
  toNewGoalInput,
  validateGoalValues,
} from './goal-form-values';

function values(overrides: Partial<GoalFormValues> = {}): GoalFormValues {
  return { ...newGoalValues(), name: 'Viagem', targetDigits: '1000000', ...overrides };
}

describe('validateGoalValues', () => {
  it('should_have_no_errors_when_name_and_target_are_filled', () => {
    // Arrange
    const filled = values();
    // Act
    const errors = validateGoalValues(filled);
    // Assert
    expect(errors).toEqual({});
  });

  it('should_ask_for_the_name_when_it_is_blank', () => {
    // Arrange
    const blank = values({ name: '   ' });
    // Act
    const errors = validateGoalValues(blank);
    // Assert
    expect(errors.name).toBe(GOAL_MESSAGES.name);
  });

  it('should_ask_for_the_target_when_it_is_zero', () => {
    // Arrange
    const empty = values({ targetDigits: '' });
    // Act
    const errors = validateGoalValues(empty);
    // Assert
    expect(errors.target).toBe(GOAL_MESSAGES.target);
  });
});

describe('toGoalInput', () => {
  it('should_trim_the_name_and_convert_the_target_to_cents_when_building_the_input', () => {
    // Arrange
    const filled = values({ name: '  Viagem  ', targetDigits: '1000000' });
    // Act
    const input = toGoalInput(filled);
    // Assert
    expect(input).toMatchObject({ name: 'Viagem', targetCents: 1000000 });
  });

  it('should_send_null_when_there_is_no_deadline', () => {
    // Arrange
    const withoutDeadline = values({ targetDate: '' });
    // Act
    const input = toGoalInput(withoutDeadline);
    // Assert
    expect(input.targetDate).toBeNull();
  });

  it('should_send_the_deadline_when_it_is_filled', () => {
    // Arrange
    const withDeadline = values({ targetDate: '2027-12-01' });
    // Act
    const input = toGoalInput(withDeadline);
    // Assert
    expect(input.targetDate).toBe('2027-12-01');
  });
});

describe('toNewGoalInput', () => {
  it('should_convert_the_initial_value_to_cents_when_it_is_filled', () => {
    // Arrange
    const withInitial = values({ initialDigits: '150000' });
    // Act
    const input = toNewGoalInput(withInitial);
    // Assert
    expect(input.initialCents).toBe(150000);
  });

  it('should_send_zero_when_the_initial_value_is_empty', () => {
    // Arrange
    const withoutInitial = values();
    // Act
    const input = toNewGoalInput(withoutInitial);
    // Assert
    expect(input.initialCents).toBe(0);
  });
});
