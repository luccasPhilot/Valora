import { describe, expect, it } from 'vitest';

import {
  describeComparedPeriod,
  describeTrend,
  describeVariation,
  formatVariation,
  variationDirection,
} from './analysis-labels';

describe('formatVariation', () => {
  it('should_show_a_plus_sign_when_the_spending_rose', () => {
    // Arrange
    const percent = 50;
    // Act
    const label = formatVariation(percent);
    // Assert
    expect(label).toBe('+ 50%');
  });

  it('should_show_the_typographic_minus_when_the_spending_fell', () => {
    // Arrange
    const percent = -10;
    // Act
    const label = formatVariation(percent);
    // Assert
    expect(label).toBe('− 10%');
  });

  it('should_show_zero_without_a_sign_when_nothing_changed', () => {
    // Arrange
    const percent = 0;
    // Act
    const label = formatVariation(percent);
    // Assert
    expect(label).toBe('0%');
  });

  it('should_show_new_when_there_was_no_spending_before', () => {
    // Arrange
    const percent = null;
    // Act
    const label = formatVariation(percent);
    // Assert
    expect(label).toBe('Novo');
  });

  it('should_keep_one_decimal_when_the_percent_has_one', () => {
    // Arrange
    const percent = 12.5;
    // Act
    const label = formatVariation(percent);
    // Assert
    expect(label).toBe('+ 12,5%');
  });
});

describe('variationDirection', () => {
  it.each([
    [20, 'up'],
    [-5, 'down'],
    [0, 'flat'],
    [null, 'none'],
  ] as const)('should_map_%s_to_%s', (percent, expected) => {
    // Arrange
    // Act
    const direction = variationDirection(percent);
    // Assert
    expect(direction).toBe(expected);
  });
});

describe('describeVariation', () => {
  it('should_say_more_when_the_spending_rose', () => {
    // Arrange
    // Act
    const text = describeVariation(20);
    // Assert
    expect(text).toBe('20% a mais');
  });

  it('should_say_less_when_the_spending_fell', () => {
    // Arrange
    // Act
    const text = describeVariation(-10);
    // Assert
    expect(text).toBe('10% a menos');
  });

  it('should_say_equal_when_nothing_changed', () => {
    // Arrange
    // Act
    const text = describeVariation(0);
    // Assert
    expect(text).toBe('Igual');
  });

  it('should_return_null_when_there_is_no_base_to_compare', () => {
    // Arrange
    // Act
    const text = describeVariation(null);
    // Assert
    expect(text).toBeNull();
  });
});

describe('describeComparedPeriod', () => {
  it('should_name_the_same_stretch_when_the_month_is_in_progress', () => {
    // Arrange
    const period = { comparedThroughDay: 17, previousMonth: '2026-10' };
    // Act
    const text = describeComparedPeriod(period);
    // Assert
    expect(text).toBe('até o dia 17, contra o mesmo trecho de outubro');
  });

  it('should_name_only_the_previous_month_when_the_month_has_ended', () => {
    // Arrange
    const period = { comparedThroughDay: null, previousMonth: '2026-08' };
    // Act
    const text = describeComparedPeriod(period);
    // Assert
    expect(text).toBe('contra agosto');
  });
});

describe('describeTrend', () => {
  it('should_list_one_value_per_month', () => {
    // Arrange
    const months = ['2026-10', '2026-11'];
    // Act
    const text = describeTrend('Mercado', months, [90000, 100000], false);
    // Assert
    expect(text).toBe('Gasto em Mercado por mês: out. R$ 900,00; nov. R$ 1.000,00.');
  });

  it('should_hide_the_values_when_they_are_hidden', () => {
    // Arrange
    const months = ['2026-10', '2026-11'];
    // Act
    const text = describeTrend('Mercado', months, [90000, 100000], true);
    // Assert
    expect(text).toBe('Gasto em Mercado por mês: out. R$ ••••; nov. R$ ••••.');
  });
});
