import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppProviders } from '../../src/app/providers';
import { createQueryClient } from '../../src/app/query-client';
import { appRoutes } from '../../src/app/router';

/**
 * O app inteiro (menu, topo e a tela do endereço) com as rotas de produção. O cliente das consultas
 * não repete: um erro aparece na hora, sem esperar o intervalo real da repetição.
 */
export function renderApp(initialPath: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  const queryClient = createQueryClient({ retry: false });
  const renderResult = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...renderResult, router, queryClient };
}
