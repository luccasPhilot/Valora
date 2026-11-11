import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';

let testApp: TestApp;

afterEach(async () => {
  await testApp.app.close();
});

// Sem banco no ar: a validação do intervalo responde antes de qualquer consulta.
async function getNetWorth(query: string) {
  testApp = buildTestApp();
  const response = await testApp.app.inject({ method: 'GET', url: `/api/v1/net-worth${query}` });
  return { statusCode: response.statusCode, body: response.json() };
}

describe('GET /api/v1/net-worth — validação', () => {
  it('should_answer_400_with_from_in_details_when_from_is_after_to', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getNetWorth('?from=2026-08&to=2026-03');
    // Assert
    expect({ statusCode, code: body.error.code, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      field: 'from',
    });
  });

  it('should_answer_400_when_the_range_has_sixty_one_months', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getNetWorth('?from=2021-11&to=2026-11');
    // Assert
    expect({ statusCode, code: body.error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('should_answer_400_with_from_in_details_when_from_has_an_invalid_month', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getNetWorth('?from=2026-13');
    // Assert
    expect({ statusCode, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      field: 'from',
    });
  });

  it('should_answer_400_with_to_in_details_when_to_is_not_in_the_year_month_format', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getNetWorth('?to=novembro');
    // Assert
    expect({ statusCode, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      field: 'to',
    });
  });
});
