import { createBrowserRouter, type RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { ScreenSkeleton } from '@/components/states/skeletons';

// Cada área é carregada sob demanda; o AppShell mostra o skeleton enquanto o arquivo chega.
export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    hydrateFallbackElement: <ScreenSkeleton />,
    children: [
      { index: true, lazy: () => import('@/features/dashboard/dashboard-page') },
      { path: 'transacoes', lazy: () => import('@/features/transactions/transactions-page') },
      { path: 'orcamentos', lazy: () => import('@/features/budgets/budgets-page') },
      { path: 'planejamento', lazy: () => import('@/features/planning/planning-page') },
      { path: 'metas', lazy: () => import('@/features/goals/goals-page') },
      { path: 'contas', lazy: () => import('@/features/accounts/accounts-page') },
      {
        path: 'contas/:accountId/faturas',
        lazy: () => import('@/features/credit-card-bills/credit-card-bills-page'),
      },
      { path: 'investimentos', lazy: () => import('@/features/investments/investments-page') },
      { path: 'categorias', lazy: () => import('@/features/categories/categories-page') },
      { path: 'ajustes', lazy: () => import('@/features/settings/settings-page') },
    ],
  },
  // Fora do shell, de propósito: a página "não encontrado" ocupa a tela inteira, sem menu.
  // Só vale para endereços que nenhuma rota acima reconhece.
  { path: '*', lazy: () => import('@/features/not-found/not-found-page') },
];

export const appRouter = createBrowserRouter(appRoutes);
