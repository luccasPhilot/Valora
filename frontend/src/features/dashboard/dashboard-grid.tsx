import type { ReactNode } from 'react';

/**
 * Grade do Início (Design System): 1 coluna no celular, 2 no tablet e 12 no computador. A ordem no
 * DOM é a do celular (leitor de tela e teclado); no computador, as posições vêm das classes `lg:`.
 */
export const DASHBOARD_GRID_CLASSES = 'grid gap-4 md:grid-cols-2 lg:grid-cols-12';

export type DashboardArea =
  'balance' | 'shortcuts' | 'month' | 'chart' | 'categories' | 'budgets' | 'transactions';

// Computador: saldo e atalhos à esquerda, os números do mês ao lado ocupando as duas linhas.
const AREA_CLASSES: Readonly<Record<DashboardArea, string>> = {
  balance: 'md:col-span-2 lg:col-span-7 lg:col-start-1 lg:row-start-1',
  shortcuts: 'md:col-span-2 lg:col-span-7 lg:col-start-1 lg:row-start-2',
  month: 'md:col-span-2 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1',
  chart: 'md:col-span-2 lg:col-span-7',
  categories: 'lg:col-span-5',
  budgets: 'lg:col-span-5',
  transactions: 'md:col-span-2 lg:col-span-7',
};

interface DashboardCellProps {
  area: DashboardArea;
  children: ReactNode;
}

export function DashboardCell({ area, children }: DashboardCellProps) {
  return <div className={`min-w-0 ${AREA_CLASSES[area]}`}>{children}</div>;
}
