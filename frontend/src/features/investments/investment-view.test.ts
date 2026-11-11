import { describe, expect, it } from 'vitest';

import type { InvestmentGroup } from '@/lib/api/investments';

import {
  colorOfType,
  colorsByType,
  groupsWithShare,
  seriesColor,
  topPositions,
} from './investment-view';

function group(
  type: string,
  totalCents: number,
  balances: number[] = [totalCents],
): InvestmentGroup {
  return {
    type,
    totalCents,
    percent: 0,
    items: balances.map((balanceCents, index) => ({
      id: `${type}-${String(index)}`,
      name: `${type} ${String(index)}`,
      subtype: null,
      balanceCents,
      percent: 0,
      institutionName: 'Banco',
    })),
  };
}

describe('seriesColor', () => {
  it('should_use_the_palette_slots_in_order_when_there_are_up_to_eight_types', () => {
    // Arrange & Act
    const colors = [0, 1, 7].map(seriesColor);
    // Assert
    expect(colors).toEqual(['var(--chart-1)', 'var(--chart-2)', 'var(--chart-8)']);
  });

  it('should_fall_back_to_the_other_gray_when_there_are_more_than_eight_types', () => {
    // Arrange & Act
    const color = seriesColor(8);
    // Assert
    expect(color).toBe('var(--chart-other)');
  });
});

describe('topPositions', () => {
  it('should_return_the_largest_positions_across_groups_in_descending_order', () => {
    // Arrange
    const groups = [group('A', 300, [100, 200]), group('B', 500, [500])];
    // Act
    const top = topPositions(groups, 2);
    // Assert
    expect(top.map(({ balanceCents, type }) => [type, balanceCents])).toEqual([
      ['B', 500],
      ['A', 200],
    ]);
  });

  it('should_return_everything_when_there_are_fewer_positions_than_the_limit', () => {
    // Arrange & Act
    const top = topPositions([group('A', 100)], 5);
    // Assert
    expect(top).toHaveLength(1);
  });
});

describe('colorsByType', () => {
  it('should_color_types_by_position_and_skip_types_without_a_positive_total', () => {
    // Arrange
    const groups = [group('A', 500), group('B', 0), group('C', 200)];
    // Act
    const colors = colorsByType(groups);
    // Assert
    expect([colorOfType(colors, 'A'), colorOfType(colors, 'C'), colorOfType(colors, 'B')]).toEqual([
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-other)',
    ]);
  });

  it('should_keep_only_positive_totals_in_the_composition', () => {
    // Arrange & Act
    const slices = groupsWithShare([group('A', 500), group('B', -10)]);
    // Assert
    expect(slices.map(({ type }) => type)).toEqual(['A']);
  });
});
