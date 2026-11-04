import { createBrowserRouter, type RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { ScreenSkeleton } from '@/components/states/skeletons';

// Cada área é carregada sob demanda; o AppShell mostra o skeleton enquanto o arquivo chega.
export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    hydrateFallbackElement: <ScreenSkeleton />,
    children: [
      { index: true, lazy: () => import('@/features/home/home-page') },
      { path: 'transacoes', lazy: () => import('@/features/transactions/transactions-page') },
      { path: 'orcamentos', lazy: () => import('@/features/budgets/budgets-page') },
      { path: 'contas', lazy: () => import('@/features/accounts/accounts-page') },
      { path: 'categorias', lazy: () => import('@/features/categories/categories-page') },
      { path: 'ajustes', lazy: () => import('@/features/settings/settings-page') },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
