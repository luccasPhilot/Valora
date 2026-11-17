import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REPORT_PERIOD,
  describeReportPeriod,
  isHistoryShorterThanPeriod,
  parseReportPeriod,
  reportRange,
} from './report-period';

describe('parseReportPeriod', () => {
  it('should_return_the_preset_when_the_value_is_valid', () => {
    // Arrange
    // Act
    const period = parseReportPeriod('24m');
    // Assert
    expect(period).toBe('24m');
  });

  it('should_fall_back_to_twelve_months_when_the_value_is_invalid', () => {
    // Arrange
    // Act
    const period = parseReportPeriod('abc');
    // Assert
    expect(period).toBe(DEFAULT_REPORT_PERIOD);
  });

  it('should_fall_back_to_twelve_months_when_there_is_no_value', () => {
    // Arrange
    // Act
    const period = parseReportPeriod(null);
    // Assert
    expect(period).toBe('12m');
  });
});

describe('reportRange', () => {
  it('should_end_at_the_current_month_and_start_five_months_before_when_the_period_is_six_months', () => {
    // Arrange
    // Act
    const range = reportRange('6m', '2026-11-10');
    // Assert
    expect(range).toEqual({ from: '2026-06', to: '2026-11' });
  });

  it('should_cross_the_year_boundary_when_the_period_is_twelve_months_in_a_early_month', () => {
    // Arrange
    // Act
    const range = reportRange('12m', '2026-02-03');
    // Assert
    expect(range).toEqual({ from: '2025-03', to: '2026-02' });
  });

  it('should_start_in_december_of_the_previous_year_when_it_is_november_and_the_period_is_twelve_months', () => {
    // Arrange
    // Act
    const range = reportRange('12m', '2026-11-10');
    // Assert
    expect(range).toEqual({ from: '2025-12', to: '2026-11' });
  });

  it('should_span_twenty_four_months_when_the_period_is_24m_in_december', () => {
    // Arrange
    // Act
    const range = reportRange('24m', '2026-12-31');
    // Assert
    expect(range).toEqual({ from: '2025-01', to: '2026-12' });
  });

  it('should_go_from_january_to_the_current_month_when_the_period_is_this_year', () => {
    // Arrange
    // Act
    const range = reportRange('ano', '2026-11-10');
    // Assert
    expect(range).toEqual({ from: '2026-01', to: '2026-11' });
  });

  it('should_return_a_single_month_when_this_year_is_asked_in_january', () => {
    // Arrange
    // Act
    const range = reportRange('ano', '2027-01-05');
    // Assert
    expect(range).toEqual({ from: '2027-01', to: '2027-01' });
  });
});

describe('describeReportPeriod', () => {
  it('should_describe_the_preset_in_words', () => {
    // Arrange
    // Act
    const descriptions = [describeReportPeriod('6m'), describeReportPeriod('ano')];
    // Assert
    expect(descriptions).toEqual(['últimos 6 meses', 'este ano']);
  });
});

describe('isHistoryShorterThanPeriod', () => {
  const TODAY = '2026-11-10';

  it('should_be_true_when_the_data_starts_after_the_first_month_of_the_period', () => {
    // Arrange
    const firstMonth = '2026-04';
    // Act
    const isShorter = isHistoryShorterThanPeriod(firstMonth, '24m', TODAY);
    // Assert
    expect(isShorter).toBe(true);
  });

  it('should_be_false_when_the_data_starts_in_the_first_month_of_the_period', () => {
    // Arrange
    const firstMonth = '2025-12';
    // Act
    const isShorter = isHistoryShorterThanPeriod(firstMonth, '12m', TODAY);
    // Assert
    expect(isShorter).toBe(false);
  });

  it('should_be_false_when_the_data_starts_before_the_period', () => {
    // Arrange
    const firstMonth = '2024-01';
    // Act
    const isShorter = isHistoryShorterThanPeriod(firstMonth, '6m', TODAY);
    // Assert
    expect(isShorter).toBe(false);
  });

  it('should_compare_with_january_when_the_period_is_this_year', () => {
    // Arrange
    const firstMonth = '2026-03';
    // Act
    const isShorter = isHistoryShorterThanPeriod(firstMonth, 'ano', TODAY);
    // Assert
    expect(isShorter).toBe(true);
  });
});
