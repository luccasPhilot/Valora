import { describe, expect, it } from 'vitest';

import { formatEstimatedMonth } from './goal-labels';

describe('formatEstimatedMonth', () => {
  it('should_return_the_short_month_and_the_year_when_given_a_date', () => {
    // Arrange
    const isoDate = '2027-03-15';
    // Act
    const label = formatEstimatedMonth(isoDate);
    // Assert
    expect(label).toBe('mar/2027');
  });

  it('should_not_keep_the_abbreviation_dot_when_the_month_name_has_one', () => {
    // Arrange
    const isoDate = '2027-09-15';
    // Act
    const label = formatEstimatedMonth(isoDate);
    // Assert
    expect(label).toBe('set/2027');
  });

  it('should_keep_the_month_of_the_date_when_it_is_the_first_day_of_the_month', () => {
    // Arrange
    const isoDate = '2028-01-01';
    // Act
    const label = formatEstimatedMonth(isoDate);
    // Assert
    expect(label).toBe('jan/2028');
  });
});
