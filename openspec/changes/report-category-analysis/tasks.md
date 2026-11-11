## 1. Regras e API

- [ ] 1.1 Mover `findCategorySpending` do `DashboardRepository` para `TransactionTotalsRepository` e acrescentar `findCategorySpendingByMonth(from, to)` (mesmas exclusões e `having > 0`); o Início usa o repositório compartilhado e seus testes continuam passando
- [ ] 1.2 `buildCategoryReport(rows, months)` puro: total por categoria somando os meses, ranking com desempate pelo nome, 5 maiores + "Sem categoria" disputando vaga + "Outros", percentuais com uma casa, `monthlyCents` alinhado, sem gastos; testes de cada caso (estorno no mesmo mês e em outro mês, empate, mais de 5 categorias)
- [ ] 1.3 `ReportsService.categorySpending(range)` com os meses da regra do histórico (começo na primeira transação) e rota `GET /reports/category-spending` com DTO; teste de rota com `app.inject()`
- [ ] 1.4 Testes de integração (Testcontainers): total do mês igual ao do Início, transferência e receita fora, estorno, saída sem categoria, manual e pendente dentro, mês sem gasto com zero

## 2. Relatório por categoria

- [ ] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (paleta de gráficos, gastos por categoria, tabelas, responsividade)
- [ ] 2.2 Schemas Zod e consulta em `frontend/src/lib/api/reports.ts`; "Por categoria" em `report-definitions.ts` e a rota `categorias`
- [ ] 2.3 Gráfico de colunas empilhadas (slots em ordem, "Outros" em cinza, legenda, tooltip com total e categorias, mês em andamento em texto, resumo para leitor de tela, eixo vertical some com valores ocultos)
- [ ] 2.4 Lista ranqueada de barras numa cor só (`primary`; "Outros" cinza) com ícone, total e percentual
- [ ] 2.5 Tabela com `ReportTable` (um mês por linha, uma coluna por série, "Total" e linha final)
- [ ] 2.6 Estados carregando, vazio ("Mudar período") e erro; "Ocultar valores"
- [ ] 2.7 Testes de componente: cores nos slots em ordem, "Outros" cinza e por último, legenda com nomes, lista ranqueada, tabela, vazio, valores ocultos com percentuais visíveis

## 3. Conferência visual

- [ ] 3.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal da página (inclusive 24 meses e nomes longos de categoria)
- [ ] 3.2 Revisar com `/ui-ux-pro-max`, conferindo que não há rosca nem cor fixa por categoria

## 4. Documentação

- [ ] 4.1 `docs/01-produto.md`: relatório por categoria (gasto líquido por mês, total do período é a soma dos meses, 5 maiores + Outros)
- [ ] 4.2 `docs/03-arquitetura.md`: endpoint `GET /reports/category-spending`; `docs/06-design-system.md`: colunas empilhadas por categoria e a regra de cor por posição; `docs/07-roadmap.md`: marcar "Análise por categoria ao longo dos meses"
