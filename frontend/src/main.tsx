import './styles/globals.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AppProviders } from '@/app/providers';
import { appRouter } from '@/app/router';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento #root não encontrado no index.html');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  </StrictMode>,
);
