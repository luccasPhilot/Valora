## Why

Saber quanto entrou e quanto saiu não responde à pergunta que importa: "estou guardando dinheiro?". A "evolução financeira" da Fase 3 mostra, mês a mês, quanto sobrou, que fatia da renda isso representa e quanto já sobrou no total, sem repetir o histórico de receitas e despesas nem o patrimônio.

## What Changes

- Cria `GET /api/v1/reports/savings-evolution?from=&to=` com, por mês: receitas, despesas, **resultado** (receitas − despesas), **taxa de poupança** (resultado ÷ receitas) e **sobra acumulada** desde o primeiro mês do período; e os totais do período (resultado, taxa de poupança, meses com sobra entre os meses fechados).
- Usa a mesma regra de receitas e despesas do Início e do histórico (sem transferências, com manuais e pendentes) e a mesma consulta de totais mensais.
- Cria o relatório `/relatorios/evolucao-financeira`: três números do período, o gráfico de barras do resultado do mês, o gráfico de linha da taxa de poupança e o gráfico de área da sobra acumulada (cada um com a sua escala, nunca dois eixos num gráfico), e a tabela ("Ver em tabela").
- Acrescenta "Evolução financeira" à navegação entre relatórios.

Itens do roadmap cobertos (Fase 3):
- **Relatórios**: **evolução financeira**, com "Ver em tabela".

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `reports`: novo relatório de evolução financeira (resultado, taxa de poupança e sobra acumulada).

## Impact

- **Código novo:** `backend/src/modules/reports/savings-evolution-report.ts` e `frontend/src/features/reports/savings-evolution/`.
- **Código alterado:** `reports.service.ts` e `reports.routes.ts`; `report-definitions.ts` e `router.tsx`.
- **API:** `GET /api/v1/reports/savings-evolution`.
- **Reutiliza:** `TransactionTotalsRepository.findMonthTotals`, a regra de meses do histórico (começa na primeira transação), `ReportTable`, o período e a marca de mês em andamento de `reports-income-expense-history`.
- **Depende de:** `reports-income-expense-history`.

## Fora do escopo

- Meta de poupança por mês e comparação com o planejado (as previsões da Fase 2 não entram aqui).
- Saldo das contas ou patrimônio ao longo do tempo: é o relatório "Evolução do patrimônio" (`report-net-worth-evolution`).
- Média móvel, projeção dos próximos meses e qualquer previsão: relatório só mostra o que aconteceu.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
