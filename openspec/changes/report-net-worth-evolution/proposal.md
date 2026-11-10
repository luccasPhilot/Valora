## Why

O cartão de patrimônio da tela Investimentos mostra a curva em 6 ou 12 meses e nada mais. Para ver como o patrimônio se compõe (contas, investimentos, faturas) em períodos maiores, em tabela, junto dos outros relatórios, falta o relatório "evolução do patrimônio", o último da Fase 3.

## What Changes

- Cria o relatório `/relatorios/patrimonio` ("Patrimônio" na navegação entre relatórios), **sem endpoint novo**: usa `GET /api/v1/net-worth?from=&to=` de `net-worth-evolution` com o período do relatório (6, 12, 24 meses ou "Este ano").
- Mostra três números (patrimônio hoje, variação desde o primeiro mês com dados e a parte em investimentos), o gráfico de área do patrimônio total, o gráfico de colunas por mês com a composição (Contas, Investimentos e Faturas em aberto abaixo do zero) e a tabela ("Ver em tabela") com as quatro cifras de cada mês.
- Acrescenta o link "Ver relatório completo" no cartão de patrimônio da tela Investimentos.
- Marca o item pai **Relatórios** do roadmap, porque este é o quarto e último relatório.

Itens do roadmap cobertos (Fase 3):
- **Relatórios**: **evolução do patrimônio**, com "Ver em tabela" (e o item **Relatórios** como um todo).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `reports`: novo relatório de evolução do patrimônio.
- `net-worth`: o cartão de patrimônio ganha o link para o relatório.

## Impact

- **Código novo:** `frontend/src/features/reports/net-worth/` (gráficos, tabela e números).
- **Código alterado:** `report-definitions.ts` e `router.tsx`; `frontend/src/features/investments/net-worth-card.tsx` (link); `frontend/src/lib/api/net-worth.ts` (reaproveitado).
- **API:** nenhuma mudança; usa `GET /api/v1/net-worth`.
- **Reutiliza:** o cálculo do patrimônio, `ReportTable`, o período e a marca de mês em andamento do relatório de receitas e despesas, a paleta de gráficos e "Ocultar valores".
- **Depende de:** `net-worth-evolution` e `reports-income-expense-history`.

## Fora do escopo

- Patrimônio por tipo de investimento (renda fixa, fundos...) ao longo do tempo.
- Ponto diário ou semanal e reconstrução do histórico anterior à primeira foto.
- Bens que não vêm do Open Finance e dívidas que não sejam fatura de cartão.
- Meta de patrimônio, projeção e comparação com a inflação ou benchmarks.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
