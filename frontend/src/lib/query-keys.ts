import type { QueryKey } from '@tanstack/react-query';

/**
 * Todas as chaves do TanStack Query, num arquivo sem dependências: quem só invalida uma consulta não
 * carrega o código da tela dona dela. Cada chave é o prefixo das consultas daquela área.
 */
export const queryKeys = {
  accounts: ['accounts'],
  alerts: ['alerts'],
  budgets: ['budgets'],
  categories: ['categories'],
  categoryRules: ['category-rules'],
  // Dentro de `categoryRules`: criar ou mudar uma regra muda as sugestões junto.
  ruleSuggestions: ['category-rules', 'suggestions'],
  pluggyMappings: ['pluggy-category-mappings'],
  connections: ['connections'],
  archivedConnections: ['connections', 'archived'],
  latestSyncRun: ['sync-runs', 'latest'],
  creditCardBills: ['credit-card-bills'],
  dashboard: ['dashboard'],
  goals: ['goals'],
  investments: ['investments'],
  netWorth: ['net-worth'],
  plannedEntries: ['planned-entries'],
  projection: ['projection'],
  reports: ['reports'],
  // Dentro de `reports`: o que muda os relatórios muda a análise de categorias junto.
  categoryInsights: ['reports', 'category-insights'],
  // As três abaixo ficam fora de `transactions` de propósito: as atualizações otimistas da lista
  // trocam os dados de toda consulta que começa por `transactions`, e estas não têm o formato da lista.
  transactions: ['transactions'],
  // A caixa "Para revisar" tem o formato da lista, então fica dentro de `transactions`.
  reviewInbox: ['transactions', 'review-inbox'],
  reviewCount: ['review-count'],
  transactionSummary: ['transaction-summary'],
  transactionDetail: ['transaction-detail'],
  duplicateCount: ['possible-duplicate-count'],
} as const satisfies Record<string, QueryKey>;

/** O que o usuário acabou de gravar; cada mudança desatualiza as consultas de `invalidationsAfter`. */
export type DataChange =
  | 'transactions'
  | 'transaction-category'
  | 'transaction-categories'
  | 'transaction-review'
  | 'rule-suggestions'
  | 'categorization'
  | 'categories'
  | 'budgets'
  | 'goals'
  | 'planned-entries'
  | 'investments'
  | 'accounts'
  | 'alerts';

// Lançar, editar, excluir ou resolver duplicata muda a lista, os totais, o gasto dos orçamentos (e os
// alertas deles), o Início, os relatórios, as candidatas e a projeção do Planejamento e as faturas.
const AFTER_TRANSACTIONS: readonly QueryKey[] = [
  queryKeys.transactions,
  queryKeys.transactionSummary,
  queryKeys.transactionDetail,
  queryKeys.duplicateCount,
  queryKeys.budgets,
  queryKeys.dashboard,
  queryKeys.reports,
  queryKeys.alerts,
  queryKeys.plannedEntries,
  queryKeys.projection,
  queryKeys.creditCardBills,
];

// A lista já mostra a categoria nova (atualização otimista); o resto soma por categoria. Trocar a
// categoria também marca como revisada e pode criar uma sugestão de regra.
const AFTER_CATEGORY_CHANGE: readonly QueryKey[] = [
  queryKeys.budgets,
  queryKeys.dashboard,
  queryKeys.reports,
  queryKeys.alerts,
  queryKeys.transactionSummary,
  queryKeys.reviewInbox,
  queryKeys.reviewCount,
  queryKeys.ruleSuggestions,
];

const INVALIDATIONS: Readonly<Record<DataChange, readonly QueryKey[]>> = {
  transactions: AFTER_TRANSACTIONS,
  'transaction-category': AFTER_CATEGORY_CHANGE,
  // A troca em massa não é otimista: a lista inteira busca de novo.
  'transaction-categories': [...AFTER_CATEGORY_CHANGE, queryKeys.transactions],
  // Revisar só tira da caixa e do contador (o Início mostra o contador).
  'transaction-review': [queryKeys.reviewInbox, queryKeys.reviewCount, queryKeys.dashboard],
  'rule-suggestions': [queryKeys.ruleSuggestions],
  // Regra ou mapeamento salvo roda a recategorização no servidor: muda tudo o que uma transação muda.
  categorization: [...AFTER_TRANSACTIONS, queryKeys.categoryRules, queryKeys.pluggyMappings],
  categories: [
    queryKeys.categories,
    queryKeys.transactions,
    queryKeys.budgets,
    queryKeys.dashboard,
    queryKeys.reports,
  ],
  budgets: [queryKeys.budgets, queryKeys.dashboard, queryKeys.alerts],
  goals: [queryKeys.goals, queryKeys.dashboard],
  'planned-entries': [queryKeys.plannedEntries, queryKeys.projection, queryKeys.dashboard],
  // A posição manual entra no patrimônio, no Início e nas metas vinculadas.
  investments: [queryKeys.investments, queryKeys.netWorth, queryKeys.dashboard, queryKeys.goals],
  accounts: [queryKeys.accounts, queryKeys.dashboard, queryKeys.netWorth, queryKeys.projection],
  alerts: [queryKeys.alerts],
};

/** As consultas que ficam desatualizadas depois da mudança (cada chave vale como prefixo). */
export function invalidationsAfter(change: DataChange): readonly QueryKey[] {
  return INVALIDATIONS[change];
}
