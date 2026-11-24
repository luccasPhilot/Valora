## Context

- `app/router.tsx`: `createBrowserRouter` com a rota do `AppShell` (filhos `lazy` por área) e a rota `*` fora do shell. Nenhuma rota tem `errorElement`.
- `app/query-client.ts`: `staleTime` 60 s, `retry: 1`, `networkMode: 'always'`.
- As chaves estão espalhadas: `ACCOUNTS_QUERY_KEY`, `DASHBOARD_QUERY_KEY` (arquivo próprio), `REPORTS_QUERY_KEY`, `NET_WORTH_QUERY_KEY`, `['category-rules']` em `categories-queries.ts` **e** em `transactions-queries.ts`, `['connections']` em `use-sync.ts`.
- Já há dois jeitos bons: `useRefreshTransactions` (lista do que muda depois de lançar ou editar) e `queryClient.invalidateQueries()` sem filtro (arquivar banco e fim da sincronização).
- `ApiError` tem `status`; uma resposta fora do contrato vira erro de validação do Zod; erro de rede é `TypeError` do `fetch`.
- Testes: `stubRoutes` rejeita rota sem resposta; o `QueryClient` dos testes é o de produção (`retry: 1` com timer real); `setup.ts` não restaura os globais.

## Goals / Non-Goals

**Goals:**
- Nenhuma tela em inglês, com stack ou sem saída.
- Depois de qualquer gravação, toda tela mostra o número novo na próxima vez que aparecer, sem esperar o `staleTime`.
- Uma lista só de chaves e uma regra só de "o que muda".
- Suíte do front que passa de primeira com a máquina fria.

**Non-Goals:**
- Timeout de fetch, faixa offline e lint de hooks (F5, F6, F9).

## Decisions

### 1. Error boundary por rota (F1)

- `RouteErrorState` em `components/states/`: usa `useRouteError()`, mostra o `ErrorState` ("Algo deu errado nesta tela", "Tentar de novo") e, em desenvolvimento, nada a mais: a stack fica no console, nunca na tela.
- **Onde:** `errorElement` em cada filho do `AppShell` (via um wrapper de rota), para o menu e o topo continuarem de pé e o usuário poder ir a outra área; mais um no próprio `AppShell` (erro no shell) e na `*`, em tela cheia como a página 404.
- **"Tentar de novo":** `navigate(0)` (recarrega a rota). Numa exceção de render, recarregar a página é o único jeito garantido de limpar o estado.
- **Chunk que não carrega:** erro cuja mensagem é de import dinâmico (`Failed to fetch dynamically imported module`, `Importing a module script failed`, `error loading dynamically imported module`, conforme o navegador). Recarrega a página **uma vez**, com uma marca em `sessionStorage` (com `try/catch`) para não entrar em laço; se falhar de novo, mostra o `ErrorState`. Função pura `isChunkLoadError(error)`, com teste.
- **Alternativa descartada:** `react-error-boundary`. Dependência nova sem necessidade: o React Router já tem o mecanismo.

### 2. `lib/query-keys.ts` e o mapa de invalidação (F2, F3)

```ts
export const queryKeys = {
  accounts: ['accounts'], alerts: ['alerts'], budgets: ['budgets'], categories: ['categories'],
  categoryRules: ['category-rules'], pluggyMappings: ['pluggy-category-mappings'],
  connections: ['connections'], creditCardBills: ['credit-card-bills'], dashboard: ['dashboard'],
  goals: ['goals'], investments: ['investments'], netWorth: ['net-worth'],
  plannedEntries: ['planned-entries'], projection: ['projection'], reports: ['reports'],
  transactions: ['transactions'], transactionSummary: ['transaction-summary'],
  transactionDetail: ['transaction-detail'], duplicateCount: ['possible-duplicate-count'],
} as const;

export type DataChange =
  | 'transactions' | 'transaction-category' | 'categorization' | 'categories' | 'budgets'
  | 'goals' | 'planned-entries' | 'investments' | 'accounts';

export function invalidationsAfter(change: DataChange): readonly QueryKey[] { ... }
```

- **Regra de cada mudança** (o que cada uma afeta, com teste por linha):
  - `transactions` (lançar, editar, excluir, resolver duplicata): lista, resumo, detalhe, contagem de duplicatas, orçamentos, Início, relatórios, alertas, previsões, projeção, faturas;
  - `transaction-category` (trocar a categoria de uma): orçamentos, Início, relatórios, alertas, resumo; com "Aplicar sempre", também a lista e as regras;
  - `categorization` (regra ou mapeamento salvo, editado ou excluído; roda `recategorizeAll` no backend): tudo de `transactions` mais regras e mapeamentos;
  - `categories` (criar, editar, arquivar categoria): categorias, lista, orçamentos, Início, relatórios;
  - `budgets`: orçamentos, Início, alertas;
  - `goals`: metas, Início;
  - `planned-entries`: previsões, projeção, Início;
  - `investments`: investimentos, patrimônio, Início, metas (metas vinculadas);
  - `accounts` (ocultar conta): contas, Início, patrimônio, projeção.
- Um hook `useInvalidateAfter(change)` devolve a função que invalida tudo em paralelo. Arquivar banco e o fim da sincronização continuam com `invalidateQueries()` sem filtro: mudam tudo.
- A atualização otimista da troca de categoria continua; só a lista de invalidação passa a vir do mapa.
- Cada `*-queries.ts` passa a importar as chaves de `query-keys.ts`; as constantes locais e `dashboard-query-key.ts`, `net-worth-query-key.ts` e `reports-query-key.ts` saem.

**Alternativa descartada:** `invalidateQueries()` sem filtro em toda gravação. Simples, mas refaz até as telas que não mudaram (relatórios de 60 meses, patrimônio) a cada categoria trocada.

### 3. Retry por tipo de erro (F13)

`retry: (failureCount, error) => failureCount < 1 && isRetryable(error)`, com `isRetryable`: `ApiError` com `status >= 500`, ou erro de rede (`TypeError` do `fetch`). 4xx e resposta fora do contrato não repetem. Função pura com teste.

### 4. Testes estáveis (F4)

- `createQueryClient({ retry })` aceita sobrescrever o retry; o render de teste (`renderWithProviders`/`renderApp`) usa `retry: false`.
- `stubRoutes` ganha respostas padrão para as rotas que o shell sempre chama (`GET /alerts`, `GET /sync-runs/latest`, `GET /connections` e as que o shell usar), sobrescrevíveis por teste.
- `vitest.config.ts`: `unstubGlobals: true`.
- Os testes de relatório trocam `fetchMock.mock.calls.at(-1)` por um filtro pela URL da rota do relatório.
- **Critério de pronto:** `npm test` do front passa três vezes seguidas logo depois de ligar a máquina (ou com `--no-cache` e a CPU ocupada), sem aumentar `testTimeout`.

## Risks / Trade-offs

- **Recarga automática em chunk:** se o servidor estiver fora, a recarga cai no cache do service worker (o app abre) ou no erro do navegador. A marca no `sessionStorage` impede laço. → Aceito.
- **Mapa de invalidação esquecido numa mutation nova:** o lint não pega. → Um teste percorre os `*-queries.ts` e falha se alguma `useMutation` não usa `useInvalidateAfter` (ou um comentário explícito de por que não).
