## 1. Banco

- [ ] 1.1 `transactions.reviewed_at` (nulo) com o índice parcial e a tabela `dismissed_rule_suggestions`; migration com `npm run db:generate`, e o `update` que marca as existentes como revisadas
- [ ] 1.2 Teste de integração da migration: transações existentes ficam revisadas; uma inserida depois fica nula

## 2. Revisão (backend)

- [ ] 2.1 Testes de integração primeiro: sincronização insere sem revisão e não mexe ao atualizar; lançamento manual nasce revisado; troca de categoria marca; pendente revisada trocada pela postada passa a revisão
- [ ] 2.2 Gravar `reviewed_at` no lançamento manual, na troca de categoria e na troca pendente → postada (`modules/sync/`)
- [ ] 2.3 Testes primeiro (`app.inject()` e integração): `?reviewed=false` (ordem mais antiga primeiro, só bancos ativos, `loadedAt`), `review-count`, `POST /transactions/review` (idempotente, ids inexistentes, 101 ids), `POST /transactions/review-all` (respeita `until`, recusa futuro)
- [ ] 2.4 Rotas, service e repository da revisão

## 3. Categoria em massa (backend)

- [ ] 3.1 Testes primeiro: troca de 5 (Open Finance e manual), categoria arquivada não muda nenhuma, alertas de orçamento reavaliados, `updatedCount`
- [ ] 3.2 `PATCH /transactions/category` numa transação do banco de dados

## 4. Regra sugerida (backend)

- [ ] 4.1 Testes unitários primeiro da escolha das sugestões (2 correções, 1 correção, regra que cobre, manuais fora, dispensada, categoria arquivada, ordem e limite de 20)
- [ ] 4.2 Testes de integração: `GET /category-rules/suggestions`, `POST …/dismiss` idempotente, `ruleSuggestion` nas respostas de `PATCH /transactions/:id` e `PATCH /transactions/category`
- [ ] 4.3 Service, repository e rotas da sugestão

## 5. Início (backend)

- [ ] 5.1 `reviewCount` em `GET /dashboard`, com teste

## 6. Telas

- [ ] 6.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; o Design System vence
- [ ] 6.2 Schemas em `lib/api/` (lista com `loadedAt`, contagem, revisão, massa, sugestões, `ruleSuggestion`), com testes
- [ ] 6.3 Visão "Para revisar" (`/transacoes/revisar`): "Ok", "Trocar categoria", etiquetas, "Conferir", "Marcar tudo como revisado" com `until = loadedAt`, estados carregando, vazio ("Tudo revisado") e erro
- [ ] 6.4 Modo "Selecionar" na lista e na caixa, barra de ações, Shift+clique no computador
- [ ] 6.5 "Criar regra?" depois da troca e lista "Sugestões" na aba Regras
- [ ] 6.6 Aviso "N para revisar" no Início
- [ ] 6.7 Invalidações: revisar, trocar em massa e aceitar sugestão atualizam a caixa, o contador, a lista, o resumo, orçamentos, Início, relatórios e alertas (pelo mapa de `lib/query-keys.ts`, se a `harden-frontend-data` já estiver pronta)
- [ ] 6.8 Testes de tela de cada fluxo e conferência em 320, 390, 768, 1024 e 1440 px, nos dois temas, com valores visíveis e ocultos

## 7. Conferência

- [ ] 7.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`

## 8. Documentação

- [ ] 8.1 `docs/01-produto.md` (caixa, categoria em massa, regra sugerida), `docs/03-arquitetura.md` (rotas novas e Decisões: revisão como coluna, sugestão calculada), `docs/04-modelo-de-dados.md` (`reviewed_at`, `dismissed_rule_suggestions`)
- [ ] 8.2 Ao arquivar: marcar os três itens da Fase 4 como feitos em `docs/08-revisao-e-proximas-fases.md`
