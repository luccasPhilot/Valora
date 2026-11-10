## Context

O Início calcula receitas e despesas por mês em `DashboardRepository.findMonthTotals` (sem transferências, com manuais e pendentes) e as preenche com zero em `fillMonthTotals`. O gráfico de barras agrupadas está em `income-expense-chart.tsx`, preso aos 6 meses do Início. Os relatórios precisam da mesma regra num intervalo maior, e o Design System exige "Ver em tabela" e resumo em texto em todos eles.

## Goals / Non-Goals

**Goals:**
- O relatório e o Início mostrarem exatamente o mesmo número para o mesmo mês.
- Uma estrutura só para os quatro relatórios (período, tabela, mês parcial), sem copiar código.
- Tabela legível no celular sem rolagem horizontal da página.

**Non-Goals:**
- Período livre, comparação, exportação, filtros.

## Decisions

**1. A consulta de totais mensais sai do módulo `dashboard`.**
- `findMonthTotals(from, to)` e o auxiliar `sumCentsWhere` vão para `TransactionTotalsRepository` (`backend/src/modules/transactions/`), e `fillMonthTotals` para `backend/src/shared/months.ts`, onde já mora `monthsEndingAt`. O `DashboardService` e o `ReportsService` dependem do mesmo repositório. Movimento sem mudança de comportamento, guardado pelos testes de integração do Início.
- *Alternativa:* copiar a consulta para o módulo de relatórios. Descartada: duas definições de "receita do mês" acabam divergindo.

**2. Endpoint.**
- `GET /reports/income-expense?from=&to=` (`AAAA-MM`; mesmas regras de `parseMonthRange`: padrão 12 meses, no máximo 60, 400 `VALIDATION_ERROR` com o campo em `details`).
- Resposta: `from`, `to` (efetivos), `months` (`month`, `incomeCents`, `expenseCents` positivos, `resultCents = income − expense`) e `totals` (`incomeCents`, `expenseCents`, `resultCents` do período).
- A lista começa no maior entre `from` e o mês da **primeira transação guardada** (uma consulta `min(date)`), para um período de 24 meses não vir com 12 meses vazios de antes de o app existir. Dentro do período, mês sem movimento vem com zeros. Sem nenhuma transação: `months` vazio e totais zero.
- Sem paginação: no máximo 60 linhas. Exceção consciente a registrar nas Decisões.

**3. Período por presets, guardado na URL.**
- Presets: `6m`, `12m` (padrão), `24m` e `ano` (de janeiro ao mês atual). O parâmetro `?periodo=` é lido por todos os relatórios e preservado ao trocar de relatório. O front converte o preset em `from`/`to` (mês atual em São Paulo) e chama a API. Preset inválido na URL cai no padrão.
- *Alternativa:* calendário livre. Descartada para esta fase: mais código, e os presets cobrem o uso real.

**4. Estrutura de rotas.**
- Rota de layout `relatorios` com `Outlet`, e filhas `receitas-e-despesas`, `categorias`, `evolucao-financeira` e `patrimonio` (as três últimas entram nas próximas changes). `index` redireciona para `receitas-e-despesas`. A lista de relatórios é uma constante (`report-definitions.ts`: chave, rótulo, caminho); cada change acrescenta a sua. A navegação entre relatórios (links com `aria-current`) só é mostrada com 2 ou mais relatórios, e o link carrega o `?periodo=` atual.
- Em `areas.ts`: área "Relatórios" (`/relatorios`, ícone `ChartColumn`, grupo `daily`, `phase: 3`), marcada como ativa em qualquer `/relatorios/*`, e o título do topo "Relatórios".
- Endereço desconhecido dentro de `/relatorios/...` cai na página "não encontrado".

**5. "Ver em tabela".**
- Controle segmentado "Gráfico" / "Tabela" (`?visao=tabela`; padrão gráfico), do `SegmentedControl` existente. A tabela mostra os mesmos dados do gráfico: um `<table>` com `<caption>` (que o leitor de tela lê), cabeçalhos de coluna e de linha, valores com `tabular-nums`, `−` tipográfico e linha de total no fim.
- Em telas estreitas a tabela rola **dentro do próprio bloco**, com a coluna do mês fixa (`sticky`); a página nunca ganha rolagem horizontal. Um componente `ReportTable` serve aos quatro relatórios.
- Com a tabela aberta o gráfico some (não aparecem os dois), e o gráfico continua com um resumo em texto para leitor de tela.

**6. Mês em andamento.**
- O mês atual é marcado como parcial: no gráfico, com a barra em hachura leve e o texto "em andamento" na legenda/tooltip; na tabela, com o texto "(em andamento)" ao lado do mês. Nunca só cor ou hachura sem texto. O front decide pelo mês de hoje em São Paulo.

**7. Gráfico.**
- Barras agrupadas receitas (série 1) × despesas (série 2), topo arredondado de 4 px, base reta, 2 px entre barras, grade horizontal discreta, eixo X abreviado ("nov."), legenda (duas séries), tooltip com receitas, despesas e resultado. O componente de barras do Início vira `components/charts/income-expense-bars.tsx`, recebendo os pontos por propriedade; o Início passa a usá-lo, sem mudar o visual.
- Texto nunca na cor da série.

**8. Tela do relatório.**
- Cabeçalho da área, filtro de período, controle Gráfico/Tabela, três números do período (Receitas `+` em `positive`, Despesas com `−`, Resultado com sinal, vermelho só se negativo), e o gráfico ou a tabela. Estados: carregando (skeleton do formato), vazio ("Ainda não há transações neste período" + "Mudar período") e erro ("Tentar de novo"). "Ocultar valores" mascara valores e some o eixo vertical.

## Risks / Trade-offs

- [Mover a consulta do Início] → Pode quebrar o Início em silêncio; os testes de integração do dashboard rodam antes e depois, e há um teste que compara o mês do relatório com o do Início.
- [Mês em andamento parece uma queda] → Marcado como parcial em texto e visual; o resultado do período inclui o mês atual (o total reflete o que já aconteceu).
- [Tabela larga no celular] → Rolagem só dentro do bloco, com a coluna do mês fixa; conferida em 320 px.

## Open Questions

Nenhuma.
