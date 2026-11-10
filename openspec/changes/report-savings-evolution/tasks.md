## 1. Regras e API

- [ ] 1.1 `buildSavingsReport(months, today)` puro: resultado, taxa com uma casa (negativa, receita zero = nulo, arredondamento), sobra acumulada, totais com taxa de soma sobre soma, contagem de meses fechados e com sobra (mês atual fora); testes de cada regra e dos limites
- [ ] 1.2 `ReportsService.savingsEvolution(range)` reaproveitando `findMonthTotals` e a lista de meses do histórico, e rota `GET /reports/savings-evolution` com DTO; teste de rota com `app.inject()`
- [ ] 1.3 Testes de integração (Testcontainers): resultado e taxa de um mês, mês só com despesas, mês sem movimento, transferência fora, e o mês igual ao do Início (`GET /dashboard`) e ao histórico (`GET /reports/income-expense`)

## 2. Relatório de evolução financeira

- [ ] 2.1 Carregar `/frontend-design:frontend-design` e `/ui-ux-pro-max`; reler o Design System (gráficos, valores financeiros, tabelas, responsividade)
- [ ] 2.2 Schemas Zod e consulta em `frontend/src/lib/api/reports.ts`; "Evolução financeira" em `report-definitions.ts` e a rota `evolucao-financeira`
- [ ] 2.3 Três números do período (resultado, taxa, meses com sobra) com sinal, "—" sem receita e vermelho só para resultado negativo
- [ ] 2.4 Gráfico de barras do resultado do mês com linha do zero e tooltip (receitas, despesas, resultado, taxa), sem vermelho
- [ ] 2.5 Gráfico de linha da taxa de poupança (referência em 0%, quebra nos meses sem receita) e gráfico de área da sobra acumulada (linha do zero)
- [ ] 2.6 Resumos para leitor de tela de cada gráfico, mês em andamento em texto e tabela com `ReportTable`
- [ ] 2.7 Estados carregando, vazio ("Mudar período") e erro; "Ocultar valores" (eixos de valores somem, percentuais ficam)
- [ ] 2.8 Testes de componente: mês negativo com sinal e texto, mês sem receita, sobra acumulada negativa, tabela, mês em andamento, vazio, valores ocultos

## 3. Conferência visual

- [ ] 3.1 Conferir em 320, 390, 768, 1024 e 1440 px, nos dois temas, sem rolagem horizontal da página (inclusive 24 meses)
- [ ] 3.2 Revisar com `/ui-ux-pro-max`

## 4. Documentação

- [ ] 4.1 `docs/01-produto.md`: definições de resultado, taxa de poupança (soma sobre soma), sobra acumulada e meses com sobra
- [ ] 4.2 `docs/03-arquitetura.md`: endpoint `GET /reports/savings-evolution`; `docs/06-design-system.md`: os três gráficos e o tratamento do resultado negativo sem vermelho; `docs/07-roadmap.md`: marcar "Evolução financeira"
