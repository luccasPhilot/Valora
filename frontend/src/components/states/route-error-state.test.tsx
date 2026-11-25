import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { markChunkReload } from '@/lib/chunk-load-error';
import { reloadPage } from '@/lib/page-reload';

import { renderApp } from '../../../test/helpers/render-app';
import { stubRoutes } from '../../../test/helpers/stub-routes';
import { FullPageRouteErrorState, RouteErrorState } from './route-error-state';

// O jsdom não recarrega a página: a recarga vira um espião.
vi.mock('@/lib/page-reload', () => ({ reloadPage: vi.fn() }));

// A tela de Metas quebra ao desenhar, como um bug de render quebraria.
vi.mock('@/features/goals/goals-page', () => ({
  Component: () => {
    throw new TypeError("Cannot read properties of undefined (reading 'targetCents')");
  },
}));

const ERROR_MESSAGE = 'Algo deu errado nesta tela';
const CHUNK_ERROR = new TypeError(
  'Failed to fetch dynamically imported module: https://valora.local/assets/reports-layout-D4k2.js',
);

/** Uma rota só, cujo arquivo nunca carrega, com o erro de tela que o app usa dentro do shell. */
function renderScreenWhoseFileFails(errorElement: ReactElement = <RouteErrorState />) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        errorElement,
        children: [{ index: true, lazy: () => Promise.reject(CHUNK_ERROR) }],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.mocked(reloadPage).mockClear();
  stubRoutes({});
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Erro inesperado numa tela', () => {
  it('should_show_the_error_message_when_a_screen_throws_while_rendering', async () => {
    // Arrange
    renderApp('/metas');
    // Act
    const message = await screen.findByText(ERROR_MESSAGE);
    // Assert
    expect(message).toBeVisible();
  });

  it('should_keep_the_menu_working_when_a_screen_throws_while_rendering', async () => {
    // Arrange
    const { router } = renderApp('/metas');
    await screen.findByText(ERROR_MESSAGE);
    // Act
    await userEvent.click(screen.getByRole('link', { name: 'Orçamentos' }));
    // Assert
    await waitFor(() => expect(router.state.location.pathname).toBe('/orcamentos'));
  });

  it('should_show_no_technical_detail_when_a_screen_throws_while_rendering', async () => {
    // Arrange
    renderApp('/metas');
    // Act
    const alert = await screen.findByRole('alert');
    // Assert
    expect(alert).toHaveTextContent(`${ERROR_MESSAGE}Tentar de novo`);
  });

  it('should_reload_the_page_when_the_user_taps_try_again', async () => {
    // Arrange
    renderApp('/metas');
    // Act
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    // Assert
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });
});

describe('Arquivo da tela que não carrega', () => {
  it('should_reload_the_page_once_when_the_file_of_the_screen_does_not_load', async () => {
    // Arrange
    // Act
    renderScreenWhoseFileFails();
    // Assert
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
  });

  it('should_show_the_error_without_reloading_when_the_file_fails_again_after_the_reload', async () => {
    // Arrange
    markChunkReload(Date.now());
    // Act
    renderScreenWhoseFileFails();
    // Assert
    expect(await screen.findByText(ERROR_MESSAGE)).toBeVisible();
    expect(reloadPage).not.toHaveBeenCalled();
  });
});

describe('Erro fora do shell', () => {
  it('should_fill_the_page_with_the_error_when_there_is_no_shell_around_it', async () => {
    // Arrange
    markChunkReload(Date.now());
    // Act
    renderScreenWhoseFileFails(<FullPageRouteErrorState />);
    // Assert
    expect(within(await screen.findByRole('main')).getByText(ERROR_MESSAGE)).toBeVisible();
  });
});
