## 1. Curva e variação do saldo (D1, D6)

- [x] 1.1 Testes unitários primeiro em `test/modules/net-worth/` para `buildBalanceSeries` e a variação das contas: conta sem foto no dia 1 (vale a de 31/10), foto com 8 dias (fora), banco arquivado no dia 10 (soma até o dia 9), conta oculta e cartão fora, mês sem foto (vazio)
- [x] 1.2 `net-worth-calculations.ts`: `buildBalanceSeries` e a variação só das contas (design, decisão 1); `NetWorthRepository`: leitura das fotos das contas de `mês − 7 dias` até o fim do mês
- [x] 1.3 `DashboardService.overview`: curva e variação pelas funções novas; `balanceChange` nulo fora do mês atual (D6); remover `findBalanceEvolution` e `findBalanceEvolutionWithArchived` e, se vazio, o `DashboardRepository`
- [x] 1.4 Testes de integração do `GET /dashboard`: `should_not_count_missing_bank_as_gain_when_it_failed_on_day_1`, `should_drop_account_from_balance_when_last_snapshot_is_older_than_7_days`, `should_return_null_balance_change_when_month_is_not_current`; os testes atuais do arquivado continuam passando

## 2. Estorno reduz a despesa (D2)

- [x] 2.1 Testes de integração primeiro: Início (`should_reduce_expense_when_refund_is_in_expense_category`, `should_count_uncategorized_inflow_as_income`), relatório de receitas e despesas (estorno reduz a despesa e o resultado não muda) e filtro de Transações (`type=expense` traz o estorno, `type=income` não; o resumo do filtro bate)
- [x] 2.2 `transactionTypeCondition` com a regra nova (design, decisão 3); atualizar os testes existentes cujo valor esperado mudava com estorno, explicando no nome o caso
- [x] 2.3 Conferir que orçamentos, gastos por categoria, análise de categorias, previsões e projeção não mudam (testes atuais passando)

## 3. Lógica duplicada (D9)

- [x] 3.1 `shared/percent.ts` com teste unitário (meio arredondado, `-0`, total zero); trocar em `category-insights-calculations.ts`, `category-spending-report.ts` e `investment-groups.ts`
- [x] 3.2 Constante única `UNCATEGORIZED_NAME` usada por `dashboard-calculations.ts` e `category-insights-calculations.ts`

## 4. Conferência

- [x] 4.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/`; abrir o Início e os relatórios em desenvolvimento e conferir que nenhum texto da tela diz que estorno é receita

## 5. Documentação

- [x] 5.1 `docs/01-produto.md`: receita e despesa com a regra do estorno; `docs/03-arquitetura.md`: `type` de `GET /transactions` e linha nova na tabela "Decisões" (estorno reduz a despesa; total do mês sem mínimo de zero; curva do saldo com a tolerância do patrimônio)
- [ ] 5.2 Ao arquivar: marcar D1, D2, D6 e D9 como resolvidos e tirar a D2 de "Decisões que dependem de você" em `docs/08-revisao-e-proximas-fases.md`
