import { describe, expect, it } from 'vitest';

import type { Goal, GoalLink, GoalLinkRef } from '@/lib/api/goals';

import {
  GOAL_MESSAGES,
  type GoalFormValues,
  goalValuesFrom,
  newGoalValues,
  toGoalInput,
  toNewGoalInput,
  validateGoalValues,
} from './goal-form-values';

const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const ARCHIVED_ID = '22222222-2222-4222-8222-222222222222';
const LINK: GoalLinkRef = { type: 'investment', id: ACTIVE_ID };
const GOAL_LINK: GoalLink = {
  type: 'investment',
  id: ACTIVE_ID,
  name: 'CDB',
  institutionName: 'Banco Azul',
  balanceCents: 1_000_000,
  isArchived: false,
};

function linkedGoal(links: GoalLink[]): Goal {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Reserva',
    icon: 'piggy-bank',
    targetCents: 2_000_000,
    savedCents: 1_000_000,
    manualSavedCents: 0,
    isLinked: links.length > 0,
    links,
    targetDate: null,
    progressPercent: 50,
    status: 'no_pace',
    remainingCents: 1_000_000,
    monthlyRateCents: 0,
    requiredMonthlyCents: null,
    estimatedDate: null,
    isEstimateTooFar: false,
    recentContributions: [],
  };
}

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

  it('should_send_zero_as_initial_value_when_the_goal_is_linked', () => {
    // Arrange
    const linked = values({ mode: 'linked', links: [LINK], initialDigits: '150000' });
    // Act
    const input = toNewGoalInput(linked);
    // Assert
    expect(input.initialCents).toBe(0);
  });
});

describe('links in the form values', () => {
  it('should_ask_for_at_least_one_item_when_the_goal_is_linked_without_items', () => {
    // Arrange
    const linkedWithoutItems = values({ mode: 'linked', links: [] });
    // Act
    const errors = validateGoalValues(linkedWithoutItems);
    // Assert
    expect(errors.links).toBe(GOAL_MESSAGES.links);
  });

  it('should_not_ask_for_items_when_the_goal_is_manual', () => {
    // Arrange
    const manual = values({ mode: 'manual', links: [] });
    // Act
    const errors = validateGoalValues(manual);
    // Assert
    expect(errors.links).toBeUndefined();
  });

  it('should_send_the_chosen_items_when_the_goal_is_linked', () => {
    // Arrange
    const linked = values({ mode: 'linked', links: [LINK] });
    // Act
    const input = toGoalInput(linked);
    // Assert
    expect(input.links).toEqual([LINK]);
  });

  it('should_send_an_empty_list_when_the_goal_is_manual_so_the_goal_gets_unlinked', () => {
    // Arrange
    const manualWithLeftovers = values({ mode: 'manual', links: [LINK] });
    // Act
    const input = toGoalInput(manualWithLeftovers);
    // Assert
    expect(input.links).toEqual([]);
  });

  it('should_start_in_linked_mode_without_archived_items_when_editing_a_linked_goal', () => {
    // Arrange
    const goal = linkedGoal([
      { ...GOAL_LINK, id: ACTIVE_ID, isArchived: false },
      { ...GOAL_LINK, id: ARCHIVED_ID, isArchived: true },
    ]);
    // Act
    const initial = goalValuesFrom(goal);
    // Assert
    expect({ mode: initial.mode, links: initial.links }).toEqual({
      mode: 'linked',
      links: [{ type: 'investment', id: ACTIVE_ID }],
    });
  });

  it('should_start_in_manual_mode_when_editing_a_goal_without_links', () => {
    // Arrange
    const goal = linkedGoal([]);
    // Act
    const initial = goalValuesFrom(goal);
    // Assert
    expect(initial.mode).toBe('manual');
  });
});
