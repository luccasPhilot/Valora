import { afterEach, describe, expect, it } from 'vitest';

import { buildTestApp, type TestApp } from '../helpers/test-app.js';

// 10h em São Paulo, 17 de novembro de 2026.
const NOW = new Date('2026-11-17T13:00:00Z');

let testApp: TestApp;

afterEach(async () => {
  await testApp.app.close();
});

// Sem banco no ar: a validação do mês responde antes de qualquer consulta.
async function getInsights(query: string) {
  testApp = buildTestApp(undefined, { now: () => NOW });
  const response = await testApp.app.inject({
    method: 'GET',
    url: `/api/v1/category-insights${query}`,
  });
  return { statusCode: response.statusCode, body: response.json() };
}

describe('GET /api/v1/category-insights — validação', () => {
  it('should_answer_400_with_month_in_details_when_the_month_is_after_the_current_one', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getInsights('?month=2026-12');
    // Assert
    expect({ statusCode, code: body.error.code, field: body.error.details[0].field }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      field: 'month',
    });
  });

  it('should_answer_400_when_the_month_is_not_in_the_year_month_format', async () => {
    // Arrange
    // Act
    const { statusCode, body } = await getInsights('?month=novembro');
    // Assert
    expect({ statusCode, code: body.error.code }).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });
});
