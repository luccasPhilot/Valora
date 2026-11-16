import {
  ArrowLeftRight,
  CalendarClock,
  ChartColumn,
  Flag,
  Home,
  Landmark,
  type LucideIcon,
  Settings,
  Tags,
  Target,
  TrendingUp,
} from 'lucide-react';

export type AreaGroup = 'daily' | 'footer';

export interface AppArea {
  readonly path: string;
  readonly title: string;
  readonly icon: LucideIcon;
  readonly group: AreaGroup;
  /** Fase do roadmap em que a funcionalidade fica pronta; 0 = só a base (estado "ainda não está pronta"). */
  readonly phase: number;
}

// Lista única das áreas: alimenta o menu, o título do topo e as rotas. Só entram áreas que existem.
export const APP_AREAS: readonly AppArea[] = [
  { path: '/', title: 'Início', icon: Home, group: 'daily', phase: 1 },
  { path: '/transacoes', title: 'Transações', icon: ArrowLeftRight, group: 'daily', phase: 1 },
  { path: '/orcamentos', title: 'Orçamentos', icon: Target, group: 'daily', phase: 1 },
  { path: '/planejamento', title: 'Planejamento', icon: CalendarClock, group: 'daily', phase: 2 },
  { path: '/metas', title: 'Metas', icon: Flag, group: 'daily', phase: 2 },
  { path: '/contas', title: 'Contas', icon: Landmark, group: 'daily', phase: 1 },
  { path: '/investimentos', title: 'Investimentos', icon: TrendingUp, group: 'daily', phase: 3 },
  { path: '/relatorios', title: 'Relatórios', icon: ChartColumn, group: 'daily', phase: 3 },
  { path: '/categorias', title: 'Categorias e regras', icon: Tags, group: 'footer', phase: 1 },
  { path: '/ajustes', title: 'Ajustes', icon: Settings, group: 'footer', phase: 1 },
];

export function findAreaByPath(pathname: string): AppArea | undefined {
  return APP_AREAS.find((area) => area.path === pathname);
}

// Telas que abrem a partir de uma área e não aparecem no menu: o item da área continua marcado.
const BILLS_PATH_PATTERN = /^\/contas\/[^/]+\/faturas$/;
const BILLS_TITLE = 'Faturas';

// Áreas que têm uma tela por endereço (um relatório por endereço): o item e o título valem em `/relatorios/*`.
const REPORTS_PATH = '/relatorios';

function isInsideReports(pathname: string): boolean {
  return pathname.startsWith(`${REPORTS_PATH}/`);
}

/** Título do topo: o da área, ou o da tela que abre dentro dela (faturas de um cartão, um relatório). */
export function findScreenTitle(pathname: string): string | undefined {
  if (BILLS_PATH_PATTERN.test(pathname)) return BILLS_TITLE;
  if (isInsideReports(pathname)) return findAreaByPath(REPORTS_PATH)?.title;
  return findAreaByPath(pathname)?.title;
}

export function isAreaActive(area: AppArea, pathname: string): boolean {
  if (pathname === area.path) return true;
  if (area.path === REPORTS_PATH) return isInsideReports(pathname);
  return area.path === '/contas' && BILLS_PATH_PATTERN.test(pathname);
}

export function listAreasByGroup(group: AreaGroup): AppArea[] {
  return APP_AREAS.filter((area) => area.group === group);
}
