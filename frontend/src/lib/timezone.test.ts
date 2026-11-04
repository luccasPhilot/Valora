import { describe, expect, it } from 'vitest';

import { APP_TIMEZONE } from './timezone';

describe('APP_TIMEZONE', () => {
  it('should_be_sao_paulo_when_dates_are_formatted', () => {
    // Arrange
    const expectedTimezone = 'America/Sao_Paulo';

    // Act
    const timezone = APP_TIMEZONE;

    // Assert
    expect(timezone).toBe(expectedTimezone);
  });
});
