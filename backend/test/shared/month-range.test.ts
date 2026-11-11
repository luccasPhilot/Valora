import { describe, expect, it } from 'vitest';

import { ValidationError } from '../../src/shared/errors.js';
import { monthRangeQuerySchema, parseMonthRange } from '../../src/shared/month-range.js';

const TODAY = '2026-11-15';

function parse(query: { from?: string; to?: string }, today = TODAY) {
  return parseMonthRange(monthRangeQuerySchema.parse(query), today);
}

describe('parseMonthRange', () => {
  it('should_return_the_last_twelve_months_when_no_parameters_are_given', () => {
    // Arrange
    // Act
    const range = parse({});
    // Assert
    expect(range).toEqual({ from: '2025-12-01', to: '2026-11-01' });
  });

  it('should_return_twelve_months_ending_at_to_when_only_to_is_given', () => {
    // Arrange
    // Act
    const range = parse({ to: '2026-03' });
    // Assert
    expect(range).toEqual({ from: '2025-04-01', to: '2026-03-01' });
  });

  it('should_cap_to_at_the_current_month_when_to_is_in_the_future', () => {
    // Arrange
    // Act
    const range = parse({ from: '2026-09', to: '2027-05' });
    // Assert
    expect(range).toEqual({ from: '2026-09-01', to: '2026-11-01' });
  });

  it('should_accept_the_given_range_when_it_crosses_the_year', () => {
    // Arrange
    // Act
    const range = parse({ from: '2025-11', to: '2026-02' });
    // Assert
    expect(range).toEqual({ from: '2025-11-01', to: '2026-02-01' });
  });

  it('should_accept_a_single_month_when_from_equals_to', () => {
    // Arrange
    // Act
    const range = parse({ from: '2026-05', to: '2026-05' });
    // Assert
    expect(range).toEqual({ from: '2026-05-01', to: '2026-05-01' });
  });

  it('should_accept_exactly_sixty_months', () => {
    // Arrange
    // Act
    const range = parse({ from: '2021-12', to: '2026-11' });
    // Assert
    expect(range).toEqual({ from: '2021-12-01', to: '2026-11-01' });
  });

  it('should_reject_with_from_in_details_when_from_is_after_to', () => {
    // Arrange
    // Act
    const act = () => parse({ from: '2026-08', to: '2026-03' });
    // Assert
    expect(act).toThrow(
      expect.objectContaining({
        name: ValidationError.name,
        details: [expect.objectContaining({ field: 'from' })],
      }),
    );
  });

  it('should_reject_when_from_is_after_the_capped_current_month', () => {
    // Arrange
    // Act
    const act = () => parse({ from: '2027-01' });
    // Assert
    expect(act).toThrow(ValidationError);
  });

  it('should_reject_with_from_in_details_when_the_range_has_sixty_one_months', () => {
    // Arrange
    // Act
    const act = () => parse({ from: '2021-11', to: '2026-11' });
    // Assert
    expect(act).toThrow(
      expect.objectContaining({
        name: ValidationError.name,
        details: [expect.objectContaining({ field: 'from' })],
      }),
    );
  });
});

describe('monthRangeQuerySchema', () => {
  it('should_reject_when_from_has_an_invalid_month', () => {
    // Arrange
    // Act
    const result = monthRangeQuerySchema.safeParse({ from: '2026-13' });
    // Assert
    expect(result.success).toBe(false);
  });

  it('should_reject_when_to_is_not_in_the_year_month_format', () => {
    // Arrange
    // Act
    const result = monthRangeQuerySchema.safeParse({ to: '2026-5' });
    // Assert
    expect(result.success).toBe(false);
  });
});
