## Why

O Início mostra só os últimos 6 meses de receitas e despesas. Quem quer entender o ano inteiro, ou comparar com o ano passado, não tem onde olhar. A Fase 3 abre a área **Relatórios**; esta change cria a estrutura que os quatro relatórios vão dividir (rotas, período, "Ver em tabela") e entrega o primeiro: o histórico de receitas e despesas.

## What Changes

- Cria a área **Relatórios** (`/relatorios`) no menu lateral, depois de Investimentos, com um relatório por endereço (`/relatorios/receitas-e-despesas` agora; os outros entram nas próximas changes). `/relatorios` abre o primeiro relatório.
- Cria a estrutura compartilhada:
  - **Período**: 6 meses, 12 meses (padrão), 24 meses ou "Este ano", guardado na URL (`?periodo=`) e mantido ao trocar de relatório;
  - **Ver em tabela**: alterna "Gráfico" e "Tabela" (`?visao=tabela`), com os mesmos números numa tabela acessível;
  - o **mês em andamento** marcado como parcial em gráficos e tabelas;
  - navegação entre relatórios, que só aparece quando há 2 ou mais.
- Cria `GET /api/v1/reports/income-expense?from=&to=`: por mês, receitas, despesas e resultado (receitas − despesas), mais os totais do período. Usa a mesma regra do Início (sem transferências internas, com lançamentos manuais e pendentes), então os números batem.
- Meses anteriores à primeira transação guardada não aparecem; meses sem movimento no meio do período aparecem com zero.
- Move `findMonthTotals` e `fillMonthTotals` do módulo `dashboard` para um lugar compartilhado (`transactions/transaction-totals.repository.ts` e `shared/months.ts`), para o Início e os relatórios usarem a mesma consulta.
- Extrai o gráfico de barras de receitas x despesas do Início para um componente compartilhado, usado nas duas telas.

Itens do roadmap cobertos (Fase 3):
- **Relatórios**, com "Ver em tabela": **histórico de receitas e despesas** (e a base dos outros três).

## Capabilities

### New Capabilities

- `reports`: área de Relatórios, período, "Ver em tabela", mês em andamento e o relatório de receitas e despesas.

### Modified Capabilities

Nenhuma. (O comportamento do Início não muda; só a consulta de totais mensais muda de lugar.)

## Impact

- **Código novo:** `backend/src/modules/reports/`, `backend/src/modules/transactions/transaction-totals.repository.ts`, `backend/src/shared/months.ts` (junto de `monthsEndingAt`, vindo de `net-worth-evolution`), `frontend/src/features/reports/` e `frontend/src/components/charts/`.
- **Código alterado:** `dashboard.repository.ts`, `dashboard.service.ts` e `dashboard-calculations.ts` (usam a consulta movida); `income-expense-chart.tsx` (passa a usar o componente compartilhado); `frontend/src/lib/areas.ts` e `router.tsx`.
- **API:** `GET /api/v1/reports/income-expense`.
- **Reutiliza:** `parseMonthRange` (`net-worth-evolution`), `transactionTypeCondition`, `SegmentedControl`, `ChartContainer`, `Money`, "Ocultar valores" e os estados padrão.
- **Depende de:** `net-worth-evolution` (utilitário de intervalo de meses) e `web-shell`.
- **Alimenta:** `report-category-analysis`, `report-savings-evolution` e `report-net-worth-evolution`.

## Fora do escopo

- Período personalizado com calendário, comparação entre dois períodos e exportação (CSV, PDF).
- Filtros por conta, categoria ou origem nos relatórios.
- Receitas e despesas por categoria (é a change `report-category-analysis`).
- Meses futuros e qualquer previsão: relatório é só o que aconteceu.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
