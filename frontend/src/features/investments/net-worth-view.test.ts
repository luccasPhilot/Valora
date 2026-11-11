import { describe, expect, it } from 'vitest';

import { describeShortHistory, netWorthFrom } from './net-worth-view';

describe('netWorthFrom', () => {
  it('should_start_eleven_months_before_the_current_month_when_the_period_is_twelve', () => {
    // Arrange
    // Act
    const from = netWorthFrom('12', '2026-11-15');
    // Assert
    expect(from).toBe('2025-12');
  });

  it('should_start_five_months_before_the_current_month_when_the_period_is_six', () => {
    // Arrange
    // Act
    const from = netWorthFrom('6', '2026-11-15');
    // Assert
    expect(from).toBe('2026-06');
  });

  it('should_cross_the_year_when_the_window_starts_in_the_previous_year', () => {
    // Arrange
    // Act
    const from = netWorthFrom('6', '2026-02-10');
    // Assert
    expect(from).toBe('2025-09');
  });
});

describe('describeShortHistory', () => {
  it('should_say_since_when_the_history_exists', () => {
    // Arrange
    // Act
    const message = describeShortHistory('2026-11-04');
    // Assert
    expect(message).toBe(
      'O histórico começa em 04/11. O gráfico aparece quando houver dois meses de dados.',
    );
  });

  it('should_say_there_is_no_history_when_there_is_no_snapshot_date', () => {
    // Arrange
    // Act
    const message = describeShortHistory(null);
    // Assert
    expect(message).toBe(
      'Ainda não há histórico de patrimônio. O gráfico aparece quando houver dois meses de dados.',
    );
  });
});
