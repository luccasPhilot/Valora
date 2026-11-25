import { describe, expect, it } from 'vitest';

import {
  APP_AREAS,
  findScreenTitle,
  getAreaCurrent,
  isAreaActive,
  listAreasByGroup,
  MENU_GROUPS,
} from './areas';

const ACCOUNTS_AREA = APP_AREAS.find((area) => area.path === '/contas');
const BILLS_PATH = '/contas/00000000-0000-4000-8000-000000000003/faturas';

const REPORTS_AREA = APP_AREAS.find((area) => area.path === '/relatorios');

function reportsArea() {
  if (!REPORTS_AREA) throw new Error('Teste: área Relatórios não existe');
  return REPORTS_AREA;
}

function accountsArea() {
  if (!ACCOUNTS_AREA) throw new Error('Teste: área Contas não existe');
  return ACCOUNTS_AREA;
}

describe('findScreenTitle', () => {
  it('should_return_categories_title_for_the_analysis_and_the_settings_title_for_the_rules_screen', () => {
    // Arrange & Act
    const titles = [findScreenTitle('/categorias'), findScreenTitle('/categorias-e-regras')];
    // Assert
    expect(titles).toEqual(['Categorias', 'Categorias e regras']);
  });

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

describe('data health screen', () => {
  const DATA_HEALTH_PATH = '/ajustes/saude-dos-dados';

  it('should_title_the_screen_saude_dos_dados', () => {
    // Arrange & Act
    const title = findScreenTitle(DATA_HEALTH_PATH);
    // Assert
    expect(title).toBe('Saúde dos dados');
  });

  it('should_keep_settings_active_when_the_data_health_screen_is_open', () => {
    // Arrange
    const settingsArea = APP_AREAS.find((area) => area.path === '/ajustes');
    if (!settingsArea) throw new Error('Teste: área Ajustes não existe');
    // Act
    const current = getAreaCurrent(settingsArea, DATA_HEALTH_PATH);
    // Assert
    expect(current).toBe('true');
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

describe('getAreaCurrent', () => {
  it('should_return_page_when_the_path_is_the_area_itself', () => {
    // Arrange & Act
    const current = getAreaCurrent(accountsArea(), '/contas');
    // Assert
    expect(current).toBe('page');
  });

  it('should_return_true_when_the_card_bills_screen_belongs_to_the_area', () => {
    // Arrange & Act
    const current = getAreaCurrent(accountsArea(), BILLS_PATH);
    // Assert
    expect(current).toBe('true');
  });

  it('should_return_true_when_a_report_screen_belongs_to_reports', () => {
    // Arrange & Act
    const current = getAreaCurrent(reportsArea(), '/relatorios/categorias');
    // Assert
    expect(current).toBe('true');
  });

  it('should_return_nothing_when_another_area_is_open', () => {
    // Arrange & Act
    const current = getAreaCurrent(accountsArea(), '/orcamentos');
    // Assert
    expect(current).toBeUndefined();
  });
});

describe('listAreasByGroup', () => {
  it('should_list_the_daily_areas_in_the_design_system_order', () => {
    // Arrange & Act
    const titles = listAreasByGroup('daily').map((area) => area.title);
    // Assert
    expect(titles).toEqual(['Início', 'Transações', 'Orçamentos', 'Categorias', 'Contas']);
  });

  it('should_keep_only_the_settings_areas_in_the_footer', () => {
    // Arrange & Act
    const footer = listAreasByGroup('footer').map((area) => [area.title, area.path]);
    // Assert
    expect(footer).toEqual([
      ['Categorias e regras', '/categorias-e-regras'],
      ['Ajustes', '/ajustes'],
    ]);
  });

  it('should_name_a_menu_group_for_every_area_that_is_not_in_the_footer', () => {
    // Arrange
    const menuGroupIds = new Set(MENU_GROUPS.map((group) => group.id));
    // Act
    const areasWithoutGroupName = APP_AREAS.filter(
      (area) => area.group !== 'footer' && !menuGroupIds.has(area.group),
    );
    // Assert
    expect(areasWithoutGroupName).toEqual([]);
  });
});
