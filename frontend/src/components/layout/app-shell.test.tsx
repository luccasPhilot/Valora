import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/providers';
import { appRoutes } from '@/app/router';

import { stubViewport } from '../../../test/helpers/match-media';

const MOBILE_WIDTH = 390;
const DESKTOP_WIDTH = 1440;

function renderApp(initialPath: string, viewportWidth: number) {
  stubViewport({ viewportWidth });
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
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
