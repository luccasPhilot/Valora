import { describe, expect, it } from 'vitest';

import { EMPTY_SELECTION, type SelectionState, toggleSelection } from './selection';

const ORDERED_IDS = ['a', 'b', 'c', 'd', 'e'];
const MAX_SIZE = 100;

function toggle(state: SelectionState, id: string, isRange = false, maxSize = MAX_SIZE) {
  return toggleSelection(state, { id, orderedIds: ORDERED_IDS, isRange, maxSize });
}

function selectedOf(state: SelectionState): string[] {
  return [...state.selectedIds].sort();
}

describe('toggleSelection', () => {
  it('should_select_the_row_when_it_was_not_selected', () => {
    // Arrange
    // Act
    const state = toggle(EMPTY_SELECTION, 'b');
    // Assert
    expect(selectedOf(state)).toEqual(['b']);
  });

  it('should_unselect_the_row_when_it_was_selected', () => {
    // Arrange
    const selected = toggle(EMPTY_SELECTION, 'b');
    // Act
    const state = toggle(selected, 'b');
    // Assert
    expect(selectedOf(state)).toEqual([]);
  });

  it('should_select_the_range_from_the_last_row_when_shift_clicking', () => {
    // Arrange
    const selected = toggle(EMPTY_SELECTION, 'b');
    // Act
    const state = toggle(selected, 'd', true);
    // Assert
    expect(selectedOf(state)).toEqual(['b', 'c', 'd']);
  });

  it('should_select_the_range_upwards_when_shift_clicking_an_earlier_row', () => {
    // Arrange
    const selected = toggle(EMPTY_SELECTION, 'd');
    // Act
    const state = toggle(selected, 'a', true);
    // Assert
    expect(selectedOf(state)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('should_select_only_the_row_when_shift_clicking_without_a_previous_row', () => {
    // Arrange
    // Act
    const state = toggle(EMPTY_SELECTION, 'c', true);
    // Assert
    expect(selectedOf(state)).toEqual(['c']);
  });

  it('should_stop_at_the_maximum_when_the_range_is_larger', () => {
    // Arrange
    const selected = toggle(EMPTY_SELECTION, 'a', false, 3);
    // Act
    const state = toggle(selected, 'e', true, 3);
    // Assert
    expect(selectedOf(state)).toEqual(['a', 'b', 'c']);
  });

  it('should_not_add_a_row_when_the_selection_is_full', () => {
    // Arrange
    const full = toggle(toggle(EMPTY_SELECTION, 'a', false, 2), 'b', false, 2);
    // Act
    const state = toggle(full, 'c', false, 2);
    // Assert
    expect(selectedOf(state)).toEqual(['a', 'b']);
  });
});
