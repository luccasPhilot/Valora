import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

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

  it('should_show_not_ready_state_when_area_has_no_feature_yet', async () => {
    // Arrange
    renderApp('/orcamentos', DESKTOP_WIDTH);
    // Act
    const message = await screen.findByText('A área Orçamentos ainda não está pronta');
    // Assert
    expect(message).toBeVisible();
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
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Orçamentos');
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
