## 1. Testes estáveis primeiro (F4)

- [ ] 1.1 `createQueryClient` com retry sobrescrevível; o render de teste usa `retry: false`
- [ ] 1.2 `stubRoutes` com respostas padrão para as rotas do shell; `unstubGlobals: true` no `vitest.config.ts`
- [ ] 1.3 Testes de relatório sem `mock.calls.at(-1)` (filtrar pela URL) e sem timer real vazando
- [ ] 1.4 Rodar `npm test` do front três vezes seguidas com a máquina fria (ou `--no-cache` com CPU ocupada), sem aumentar `testTimeout`, e anotar o resultado

## 2. Chaves e invalidações (F2, F3)

- [ ] 2.1 Testes unitários primeiro para `invalidationsAfter`: uma linha por mudança do design (decisão 2), incluindo `categorization` cobrindo Início, orçamentos, relatórios, análise e alertas
- [ ] 2.2 Criar `lib/query-keys.ts` e `useInvalidateAfter`; trocar as constantes locais e os três arquivos `*-query-key.ts`
- [ ] 2.3 Mutations de categorias, regras e mapeamentos usam `categorization`/`categories`; metas, previsões, investimentos, contas e transações usam a sua mudança; `useRefreshTransactions` vira `useInvalidateAfter('transactions')`
- [ ] 2.4 Teste que falha se alguma `useMutation` dos `*-queries.ts` não usa `useInvalidateAfter` (ou não tem comentário dizendo por quê)
- [ ] 2.5 Testes de tela: `should_show_recategorized_spending_on_home_when_rule_is_saved`, `should_show_new_goal_target_on_home_when_goal_is_edited`, `should_refresh_projection_when_planned_entry_is_created`

## 3. Repetição (F13)

- [ ] 3.1 Testes unitários primeiro para `isRetryable` (rede, 500, 503, 400, 404, resposta fora do contrato)
- [ ] 3.2 `query-client.ts` com o retry por tipo de erro

## 4. Error boundary (F1)

- [ ] 4.1 Testes primeiro: `isChunkLoadError` com as mensagens do Chrome, Safari e Firefox; tela com exceção de render mostra "Algo deu errado nesta tela" com o menu; chunk que falha recarrega uma vez e, na segunda, mostra o erro; nenhuma stack na tela
- [ ] 4.2 `RouteErrorState` em `components/states/` e `errorElement` nos filhos do `AppShell`, no `AppShell` e na `*` (design, decisão 1)
- [ ] 4.3 Conferir a tela de erro em 320, 390, 768, 1024 e 1440 px, nos dois temas, com as skills de design carregadas

## 5. Conferência

- [ ] 5.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `frontend/`

## 6. Documentação

- [ ] 6.1 `docs/03-arquitetura.md`: chaves e invalidações do front num lugar só (`lib/query-keys.ts`), linha na tabela "Decisões"
- [ ] 6.2 Ao arquivar: marcar F1, F2, F3, F4, F13 e a parte do front da P4 como resolvidos, e as prioridades 8 e 9, em `docs/08-revisao-e-proximas-fases.md`
