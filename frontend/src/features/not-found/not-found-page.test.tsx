import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AppProviders } from '@/app/providers';
import { appRoutes } from '@/app/router';

import { stubViewport } from '../../../test/helpers/match-media';
import { stubRoutes } from '../../../test/helpers/stub-routes';

const DESKTOP_WIDTH = 1440;
const PAGE_TITLE = '404 Página não encontrada';

function renderApp(initialPath: string) {
  stubViewport({ viewportWidth: DESKTOP_WIDTH });
  stubRoutes({});
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe('Página não encontrada', () => {
  it('should_show_the_404_title_and_the_message_when_the_route_does_not_exist_yet', async () => {
    // Arrange
    renderApp('/investimentos');
    // Act
    const title = await screen.findByRole('heading', { name: PAGE_TITLE });
    // Assert
    expect(title.parentElement).toHaveTextContent('Esta página não existe');
  });

  it('should_show_the_page_without_the_side_menu', async () => {
    // Arrange
    renderApp('/endereco-que-nao-existe');
    // Act
    await screen.findByRole('heading', { name: PAGE_TITLE });
    // Assert
    expect(screen.queryByRole('link', { name: 'Contas' })).not.toBeInTheDocument();
  });

  it('should_offer_only_one_way_out_which_is_the_home_button', async () => {
    // Arrange
    renderApp('/endereco-que-nao-existe');
    // Act
    await screen.findByRole('heading', { name: PAGE_TITLE });
    // Assert
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Ir para o Início',
    ]);
  });

  it('should_show_the_page_when_the_address_is_a_child_of_an_existing_route', async () => {
    // Arrange
    renderApp('/metas/abc');
    // Act
    const title = await screen.findByRole('heading', { name: PAGE_TITLE });
    // Assert
    expect(title).toBeVisible();
  });

  it('should_open_the_budgets_screen_without_the_page_when_the_route_exists', async () => {
    // Arrange
    renderApp('/orcamentos');
    // Act
    await screen.findByRole('link', { name: 'Contas' });
    // Assert
    expect(screen.queryByRole('heading', { name: PAGE_TITLE })).not.toBeInTheDocument();
  });

  it('should_go_to_the_home_when_the_button_is_pressed', async () => {
    // Arrange
    const router = renderApp('/investimentos');
    // Act
    await userEvent.click(await screen.findByRole('link', { name: 'Ir para o Início' }));
    // Assert
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('should_not_show_the_typed_address', async () => {
    // Arrange
    renderApp('/investimentos');
    // Act
    await screen.findByRole('heading', { name: PAGE_TITLE });
    // Assert
    expect(screen.queryByText(/investimentos/i)).not.toBeInTheDocument();
  });
});
