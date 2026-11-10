## Why

O Início mostra os gastos por categoria de um mês só. Para saber se o gasto com mercado está subindo, ou que categoria pesou mais no ano, é preciso comparar vários meses lado a lado. Esse é o relatório "análise por categoria ao longo dos meses".

## What Changes

- Cria `GET /api/v1/reports/category-spending?from=&to=`: o gasto líquido por categoria em cada mês do período, com as 5 maiores categorias do período, "Sem categoria" (quando disputa vaga) e "Outros" com o resto, mais os totais por mês e do período.
- Usa a mesma regra de gasto líquido do Início e dos orçamentos (por categoria e por mês, mínimo de zero, estornos reduzem, sem transferências), então o total de um mês bate com o do Início.
- Cria o relatório `/relatorios/categorias`: gráfico de colunas empilhadas por mês (uma série por categoria, paleta de gráficos em ordem), lista ranqueada de barras numa cor só com o total e o percentual de cada categoria, e a tabela ("Ver em tabela") com um mês por linha e uma categoria por coluna.
- Acrescenta "Por categoria" à navegação entre relatórios.
- Move `findCategorySpending` do módulo `dashboard` para `TransactionTotalsRepository` e acrescenta a variante por mês, para o Início e o relatório compartilharem a regra.

Itens do roadmap cobertos (Fase 3):
- **Relatórios**: **análise por categoria ao longo dos meses**, com "Ver em tabela".

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `reports`: novo relatório de gasto por categoria e mês.

## Impact

- **Código novo:** `backend/src/modules/reports/category-spending-report.ts` e `frontend/src/features/reports/category-spending/`.
- **Código alterado:** `TransactionTotalsRepository` (recebe `findCategorySpending` e ganha a variante por mês), `dashboard.service.ts` (usa o repositório compartilhado), `report-definitions.ts` e `router.tsx`.
- **API:** `GET /api/v1/reports/category-spending`.
- **Reutiliza:** `buildSpendingBreakdown` (ranking e "Outros" do Início), `ReportTable`, o filtro de período e a marca de mês em andamento de `reports-income-expense-history`, e a paleta de gráficos.
- **Depende de:** `reports-income-expense-history`.

## Fora do escopo

- Receitas por categoria (o relatório é de despesas, como o gasto por categoria do Início).
- Abrir as transações de uma categoria a partir do relatório.
- Comparar o período com o anterior e orçamento previsto × realizado.
- Escolher quais categorias aparecem: são sempre as 5 maiores do período.
- Rosca colorida por categoria: o Design System proíbe; o gráfico usa a paleta em ordem e a lista usa uma cor só.
- Itens da seção "Fora do escopo" de `docs/01-produto.md`: nenhum é tocado.
