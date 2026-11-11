## 1. Movimentos sem mudar comportamento

- [ ] 1.1 Mover `findMonthTotals` (e `sumCentsWhere`) para `TransactionTotalsRepository` em `backend/src/modules/transactions/` e `fillMonthTotals` para `backend/src/shared/months.ts`; o `DashboardService` usa os novos lugares e os testes do Início continuam passando
- [ ] 1.2 Extrair o gráfico de barras do Início para `frontend/src/components/charts/income-expense-bars.tsx` (pontos por propriedade, mês parcial opcional) e fazer `income-expense-chart.tsx` usá-lo sem mudar o visual; testes do Início continuam passando

## 2. Regras e API

- [ ] 2.1 `buildIncomeExpenseReport(totals, range, firstMonth)` puro: resultado por mês, zeros nos meses vazios, início na primeira transação, totais, sem transações; testes de cada caso
- [ ] 2.2 `TransactionTotalsRepository.findFirstTransactionMonth()` (`min(date)`) e `ReportsService.incomeExpense(range)` usando `parseMonthRange`
- [ ] 2.3 Rota `GET /reports/income-expense` com a query validada (`from`, `to`) e DTO; teste de rota com `app.inject()` (padrão de 12 meses e erros 400)
- [ ] 2.4 Testes de integração (Testcontainers): transferência fora, manual e pendente dentro, despesa sem categoria, mês sem movimento, início na primeira transação, e o mês do relatório igual ao do Início (`GET /dashboard`)

## 3. Estrutura dos relatórios e tela

- [ ] 3.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (gráficos, paleta, tabelas, controle segmentado, estados, responsividade)
- [ ] 3.2 Schemas Zod em `frontend/src/lib/api/reports.ts` e consulta do TanStack Query a partir do período
- [ ] 3.3 Utilitários do período (`periodo` ↔ `from`/`to` no fuso de São Paulo, preset inválido cai em 12 meses, "Este ano") em `frontend/src/features/reports/`, com testes (virada de ano, janeiro, dezembro)
- [ ] 3.4 Nova área "Relatórios" em `areas.ts` (ativa em `/relatorios/*`), rotas filhas e redirecionamento do índice em `router.tsx`, e `report-definitions.ts` com a lista de relatórios
- [ ] 3.5 Layout da área: título, filtro de período (na URL), controle "Gráfico" / "Tabela" (na URL) e navegação entre relatórios (só com 2 ou mais, preservando `?periodo=`)
- [ ] 3.6 `ReportTable` (caption, cabeçalhos, `tabular-nums`, `−`, linha de total, rolagem só dentro do bloco com coluna do mês fixa) e marca de mês em andamento
- [ ] 3.7 Relatório de receitas e despesas: três números do período, gráfico de barras agrupadas com legenda, tooltip e resumo para leitor de tela, e a tabela
- [ ] 3.8 Estados carregando, vazio ("Mudar período") e erro; "Ocultar valores"
- [ ] 3.9 Testes de componente: período na URL e padrão, preset inválido, troca Gráfico/Tabela, mês em andamento em texto, navegação oculta com um relatório, vazio, valores ocultos, `/relatorios/inexistente` em "não encontrado"

## 4. Conferência visual

- [ ] 4.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal da página (inclusive a tabela de 24 meses em 320 px)
- [ ] 4.2 Revisar com `/ui-ux-pro-max`

## 5. Documentação

- [ ] 5.1 `docs/01-produto.md`: seção "Relatórios" (período, "Ver em tabela", mês em andamento, regra de receitas e despesas igual à do Início)
- [ ] 5.2 `docs/03-arquitetura.md`: endpoint `GET /reports/income-expense` e as decisões (consulta de totais mensais compartilhada, relatórios sem paginação, período por presets na URL)
- [ ] 5.3 `docs/06-design-system.md`: layout de Relatórios, tabela e marca de mês parcial; `docs/07-roadmap.md`: marcar "Histórico de receitas e despesas"
