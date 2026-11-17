import { createBrowserRouter, redirect, type RouteObject } from 'react-router';

import { AppShell } from '@/components/layout/app-shell';
import { AppLoadingSkeleton } from '@/components/states/skeletons';
import { REPORT_DEFINITIONS, REPORTS_BASE_PATH } from '@/features/reports/report-definitions';

// Cada área é carregada sob demanda; o AppShell mostra o skeleton enquanto o arquivo chega.
export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    hydrateFallbackElement: <AppLoadingSkeleton />,
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
      {
        path: 'relatorios',
        lazy: () => import('@/features/reports/reports-layout'),
        children: [
          // `/relatorios` abre o primeiro relatório, mantendo o `?periodo=` da URL.
          {
            index: true,
            loader: ({ request }) =>
              redirect(
                `${REPORTS_BASE_PATH}/${REPORT_DEFINITIONS[0]?.path}${new URL(request.url).search}`,
              ),
          },
          {
            path: 'receitas-e-despesas',
            lazy: () => import('@/features/reports/income-expense-report-page'),
          },
          {
            path: 'categorias',
            lazy: () => import('@/features/reports/category-spending/category-spending-page'),
          },
          {
            path: 'evolucao-financeira',
            lazy: () => import('@/features/reports/savings-evolution/savings-evolution-page'),
          },
          {
            path: 'patrimonio',
            lazy: () => import('@/features/reports/net-worth/net-worth-report-page'),
          },
        ],
      },
      { path: 'categorias', lazy: () => import('@/features/categories/analysis/analysis-page') },
      {
        path: 'categorias-e-regras',
        lazy: () => import('@/features/categories/categories-page'),
      },
      { path: 'ajustes', lazy: () => import('@/features/settings/settings-page') },
    ],
  },
  // Fora do shell, de propósito: a página "não encontrado" ocupa a tela inteira, sem menu.
  // Só vale para endereços que nenhuma rota acima reconhece.
  { path: '*', lazy: () => import('@/features/not-found/not-found-page') },
];

export const appRouter = createBrowserRouter(appRoutes);
