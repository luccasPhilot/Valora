// Carrega a tela na importação do arquivo: o primeiro teste não paga a transformação dela.
import '@/features/dashboard/dashboard-page';
import '@/features/budgets/budgets-page';

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { stubViewport } from '../../../test/helpers/match-media';
import { renderApp as renderAppAt } from '../../../test/helpers/render-app';
import { stubRoutes } from '../../../test/helpers/stub-routes';

const MOBILE_WIDTH = 390;
const DESKTOP_WIDTH = 1440;

function renderApp(initialPath: string, viewportWidth: number) {
  stubViewport({ viewportWidth });
  stubRoutes({});
  return renderAppAt(initialPath);
}

function getMenuOverlay(): Element {
  const overlay = document.querySelector('[data-slot="sheet-overlay"]');
  if (!overlay) throw new Error('Menu overlay not found in the document');
  return overlay;
}

describe('AppShell on desktop', () => {
  it('should_keep_menu_fixed_and_hide_menu_button_when_viewport_is_1440px', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    const menuLink = await screen.findByRole('link', { name: 'Contas' });
    // Assert
    expect(menuLink).toBeVisible();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveClass('lg:hidden');
  });

  it('should_highlight_current_area_when_user_is_on_budgets', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    const activeLink = await screen.findByRole('link', { name: 'Orçamentos' });
    // Assert
    expect(activeLink).toHaveAttribute('data-active', 'true');
  });

  it('should_show_area_title_in_the_header_when_route_changes', async () => {
    // Arrange
    renderApp('/contas', DESKTOP_WIDTH);
    // Act
    const title = await screen.findByRole('heading', { level: 1 });
    // Assert
    expect(title).toHaveTextContent('Contas');
  });

  it('should_show_home_title_in_the_header_when_route_is_the_root', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    // Act
    const title = await screen.findByRole('heading', { level: 1 });
    // Assert
    expect(title).toHaveTextContent('Início');
  });
});

describe('AppShell browser tab title', () => {
  it('should_name_the_tab_after_the_open_area_when_user_is_on_budgets', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    await screen.findByRole('heading', { level: 1, name: 'Orçamentos' });
    // Assert
    await waitFor(() => expect(document.title).toBe('Orçamentos | Valora'));
  });

  it('should_update_the_tab_title_when_user_picks_another_area', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    await screen.findByRole('heading', { level: 1, name: 'Orçamentos' });
    // Act
    await userEvent.click(screen.getByRole('link', { name: 'Metas' }));
    // Assert
    await waitFor(() => expect(document.title).toBe('Metas | Valora'));
  });

  it('should_keep_the_report_title_when_a_report_is_open', async () => {
    // Arrange
    renderApp('/relatorios/categorias', DESKTOP_WIDTH);
    // Act
    await screen.findByRole('heading', { level: 1, name: 'Relatórios' });
    // Assert
    await waitFor(() => expect(document.title).toBe('Por categoria | Relatórios | Valora'));
  });
});

describe('AppShell landmarks and skip link', () => {
  it('should_group_the_daily_areas_in_a_named_navigation_when_menu_is_expanded', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    // Act
    const navigation = await screen.findByRole('navigation', { name: 'Principal' });
    // Assert
    expect(within(navigation).getByRole('link', { name: 'Transações' })).toBeVisible();
  });

  it('should_split_the_menu_in_three_named_groups_when_menu_is_expanded', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    const navigation = await screen.findByRole('navigation', { name: 'Principal' });
    // Act
    const groups = within(navigation).getAllByRole('list');
    // Assert
    expect(groups.map((group) => group.getAttribute('aria-labelledby'))).toEqual([
      'menu-group-daily',
      'menu-group-planning',
      'menu-group-wealth',
    ]);
  });

  it('should_keep_planning_and_goals_together_in_the_planning_group', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    await screen.findByRole('navigation', { name: 'Principal' });
    // Act
    const planningGroup = screen.getByRole('list', { name: 'Planejamento' });
    // Assert
    expect(
      within(planningGroup)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Planejamento', 'Metas']);
  });

  it('should_keep_investments_and_reports_together_in_the_wealth_group', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    await screen.findByRole('navigation', { name: 'Principal' });
    // Act
    const wealthGroup = screen.getByRole('list', { name: 'Patrimônio' });
    // Assert
    expect(
      within(wealthGroup)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Investimentos', 'Relatórios']);
  });

  it('should_group_settings_in_their_own_navigation_when_menu_is_expanded', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    // Act
    const navigation = await screen.findByRole('navigation', { name: 'Configurações' });
    // Assert
    expect(within(navigation).getByRole('link', { name: 'Ajustes' })).toBeVisible();
  });

  it('should_mark_only_the_open_area_as_the_current_page_when_user_is_on_budgets', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    const currentLinks = await screen.findAllByRole('link', { current: 'page' });
    // Assert
    expect(currentLinks.map((link) => link.textContent)).toEqual(['Orçamentos']);
  });

  it('should_make_the_skip_link_the_first_stop_when_user_presses_tab', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    await screen.findByRole('heading', { level: 1 });
    // Act
    await userEvent.tab();
    // Assert
    expect(screen.getByRole('link', { name: 'Pular para o conteúdo' })).toHaveFocus();
  });

  it('should_move_focus_to_the_content_without_changing_the_address_when_skip_link_is_used', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    await screen.findByRole('heading', { level: 1 });
    // Act
    await userEvent.click(screen.getByRole('link', { name: 'Pular para o conteúdo' }));
    // Assert
    expect(document.getElementById('conteudo')).toHaveFocus();
  });
});

describe('AppShell on mobile', () => {
  it('should_hide_menu_until_menu_button_is_pressed_when_viewport_is_390px', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await screen.findByRole('heading', { level: 1 });
    // Act
    const menuLinks = screen.queryByRole('link', { name: 'Transações' });
    // Assert
    expect(menuLinks).not.toBeInTheDocument();
  });

  it('should_open_menu_over_content_when_menu_button_is_pressed', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    // Assert
    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('should_close_menu_and_open_area_when_user_picks_budgets', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(menu).getByRole('link', { name: 'Orçamentos' }));
    // Assert
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Orçamentos'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_close_menu_when_close_button_is_pressed', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = await screen.findByRole('dialog');
    // Act
    await userEvent.click(within(menu).getByRole('button', { name: 'Fechar menu' }));
    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_close_menu_when_user_taps_outside', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    await screen.findByRole('dialog');
    // Act
    await userEvent.click(getMenuOverlay());
    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_close_menu_when_user_presses_escape', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    await screen.findByRole('dialog');
    // Act
    await userEvent.keyboard('{Escape}');
    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('AppShell mobile menu focus and state', () => {
  it('should_announce_the_menu_button_as_expanded_only_while_the_menu_is_open', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    const trigger = await screen.findByRole('button', { name: 'Abrir menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Act
    await userEvent.click(trigger);
    // Assert
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should_return_focus_to_the_menu_button_when_menu_is_closed_with_escape', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    const trigger = await screen.findByRole('button', { name: 'Abrir menu' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog');
    // Act
    await userEvent.keyboard('{Escape}');
    // Assert
    expect(trigger).toHaveFocus();
  });

  it('should_close_menu_with_a_single_escape_when_a_menu_link_has_focus', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = await screen.findByRole('dialog');
    within(menu).getByRole('link', { name: 'Orçamentos' }).focus();
    // Act
    await userEvent.keyboard('{Escape}');
    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_close_menu_when_user_goes_back_while_menu_is_open', async () => {
    // Arrange
    const { router } = renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    await screen.findByRole('dialog');
    // Act
    await act(() => router.navigate(-1));
    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_keep_menu_closed_when_user_goes_forward_after_closing_it', async () => {
    // Arrange
    const { router } = renderApp('/orcamentos', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    await screen.findByRole('dialog');
    await act(() => router.navigate(-1));
    // Act
    await act(() => router.navigate(1));
    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_stay_on_the_same_screen_when_menu_is_closed_by_going_back', async () => {
    // Arrange
    const { router } = renderApp('/orcamentos', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    await screen.findByRole('dialog');
    // Act
    await act(() => router.navigate(-1));
    // Assert
    expect(router.state.location.pathname).toBe('/orcamentos');
  });

  it('should_return_to_the_previous_screen_and_not_to_the_menu_when_user_goes_back_after_picking_an_area', async () => {
    // Arrange
    const { router } = renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = await screen.findByRole('dialog');
    await userEvent.click(within(menu).getByRole('link', { name: 'Orçamentos' }));
    await screen.findByRole('heading', { level: 1, name: 'Orçamentos' });
    // Act
    await act(() => router.navigate(-1));
    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should_not_mount_tooltips_for_menu_links_when_menu_is_a_drawer', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = await screen.findByRole('dialog');
    // Act
    within(menu).getByRole('link', { name: 'Orçamentos' }).focus();
    // Assert
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

describe('AppShell collapsible menu on desktop', () => {
  it('should_name_the_button_expand_menu_when_collapse_button_is_pressed', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Recolher menu' }));
    // Assert
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('should_mark_the_collapse_button_as_expanded_when_menu_opens_expanded', async () => {
    // Arrange / Act
    renderApp('/', DESKTOP_WIDTH);
    // Assert
    expect(await screen.findByRole('button', { name: 'Recolher menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('should_keep_the_menu_collapsed_when_user_collapsed_it_before_reloading', async () => {
    // Arrange
    const firstVisit = renderApp('/', DESKTOP_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Recolher menu' }));
    firstVisit.unmount();
    // Act
    renderApp('/', DESKTOP_WIDTH);
    // Assert
    expect(await screen.findByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
  });

  it('should_open_expanded_and_still_collapse_when_local_storage_is_unavailable', async () => {
    // Arrange
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    renderApp('/', DESKTOP_WIDTH);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Recolher menu' }));
    // Assert
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('should_show_the_area_name_in_a_tooltip_when_collapsed_icon_receives_focus', async () => {
    // Arrange
    renderApp('/', DESKTOP_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Recolher menu' }));
    // Act
    screen.getByRole('link', { name: 'Orçamentos' }).focus();
    // Assert
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Orçamentos');
  });

  it('should_hide_the_collapse_button_when_viewport_is_390px', async () => {
    // Arrange
    renderApp('/', MOBILE_WIDTH);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    const menu = await screen.findByRole('dialog');
    // Act
    const collapseButton = within(menu).getByRole('button', { name: 'Recolher menu' });
    // Assert
    expect(collapseButton).toHaveClass('hidden');
  });
});

describe('AppShell logo', () => {
  it('should_name_the_logo_link_valora_when_menu_is_expanded', async () => {
    // Arrange / Act
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Assert
    expect(await screen.findByRole('link', { name: 'Valora' })).toHaveAttribute('href', '/');
  });

  it('should_keep_the_logo_link_when_menu_is_collapsed', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Recolher menu' }));
    // Assert
    expect(screen.getByRole('link', { name: 'Valora' })).toBeInTheDocument();
  });

  it('should_open_the_home_screen_when_user_presses_the_logo', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Valora' }));
    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
  });
});
