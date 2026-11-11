import { describe, expect, it } from 'vitest';

import { APP_AREAS, findScreenTitle, isAreaActive } from './areas';

const ACCOUNTS_AREA = APP_AREAS.find((area) => area.path === '/contas');
const BILLS_PATH = '/contas/00000000-0000-4000-8000-000000000003/faturas';

function accountsArea() {
  if (!ACCOUNTS_AREA) throw new Error('Teste: área Contas não existe');
  return ACCOUNTS_AREA;
}

describe('findScreenTitle', () => {
  it('should_return_the_area_title_when_the_path_is_an_area', () => {
    // Arrange & Act
    const title = findScreenTitle('/contas');
    // Assert
    expect(title).toBe('Contas');
  });

  it('should_return_goals_title_when_the_path_is_the_goals_area', () => {
    // Arrange & Act
    const title = findScreenTitle('/metas');
    // Assert
    expect(title).toBe('Metas');
  });

  it('should_return_investments_title_when_the_path_is_the_investments_area', () => {
    // Arrange & Act
    const title = findScreenTitle('/investimentos');
    // Assert
    expect(title).toBe('Investimentos');
  });

  it('should_return_bills_title_when_the_path_is_the_card_bills_screen', () => {
    // Arrange & Act
    const title = findScreenTitle(BILLS_PATH);
    // Assert
    expect(title).toBe('Faturas');
  });

  it('should_return_nothing_when_the_path_is_unknown', () => {
    // Arrange & Act
    const title = findScreenTitle('/nao-existe');
    // Assert
    expect(title).toBeUndefined();
  });
});

describe('isAreaActive', () => {
  it('should_keep_accounts_active_when_the_card_bills_screen_is_open', () => {
    // Arrange & Act
    const isActive = isAreaActive(accountsArea(), BILLS_PATH);
    // Assert
    expect(isActive).toBe(true);
  });

  it('should_not_mark_accounts_active_when_another_area_is_open', () => {
    // Arrange & Act
    const isActive = isAreaActive(accountsArea(), '/orcamentos');
    // Assert
    expect(isActive).toBe(false);
  });
});
