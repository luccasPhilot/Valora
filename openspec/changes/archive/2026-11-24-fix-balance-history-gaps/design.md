## Context

- `DashboardService.overview` monta a curva com `DashboardRepository.findBalanceEvolutionWithArchived` (soma das fotos por dia, com o passado dos arquivados filtrado em SQL) e a variação com `findBalanceEvolution` (só ativos), cuja primeira linha é a primeira foto do mês. Um dia em que um banco não gravou foto soma só os outros.
- `net-worth-calculations.ts` já resolve isso para o patrimônio: `groupSnapshotRows`, `valueOnDay` (foto mais recente até o dia, no máximo `SNAPSHOT_TOLERANCE_DAYS = 7`), `isCountedOn` (oculto, "Dinheiro" e arquivado antes do dia) e `buildMonthChange` (só ativos nas duas pontas). `valueOnDay(...).accountsCents` soma corrente e poupança não ocultas, a mesma definição de `isIncludedInTotalBalance`.
- `transactionTypeCondition` é a única definição de receita, despesa e transferência; `TransactionTotalsRepository` (Início, relatórios, resumo de Transações) e o filtro de tipo usam ela. O gasto por categoria (`netSpentCents`) já é líquido, com mínimo de zero por categoria.

## Goals / Non-Goals

**Goals:**
- A curva e a variação do saldo não mudam porque um banco deixou de gravar a foto de um dia.
- Receita e despesa do Início e dos relatórios batem com os gastos por categoria quando há estorno.
- Uma definição só para "arquivado antes do dia", para o percentual com uma casa e para "Sem categoria".

**Non-Goals:**
- Saída em categoria de receita (fica como está, pelo sinal).
- Reduzir as consultas do `GET /dashboard` (D4).

## Decisions

### 1. Curva do saldo pelas funções do patrimônio (D1, D9)

- O `NetWorthRepository` ganha a leitura das fotos **só das contas** (`findAccountSnapshots`, hoje privado, passa a público ou ganha um irmão), de `primeiro dia do mês − 7` até o último dia, para a tolerância alcançar a foto do mês anterior.
- Nova função pura em `net-worth-calculations.ts`: `buildBalanceSeries(items, month, today)` devolve um ponto por dia **que tenha foto** de algum item contado (o mesmo critério de hoje, "só dos dias que têm foto"), com `balanceCents = valueOnDay(items, dia, 'with_archived').accountsCents`.
- `balanceChange`: `buildMonthChange` passa a receber a parte a comparar, ou ganha a variante `buildAccountsMonthChange(items, totalBalanceCents, today)` com `active_only` e `accountsCents`. A primeira ponta é o primeiro dia do mês com foto de banco ativo, avaliado com a tolerância.
- `DashboardRepository.findBalanceEvolution` e `findBalanceEvolutionWithArchived` são removidos (o SQL de "arquivado antes do dia" some). Se o `DashboardRepository` ficar vazio, sai do módulo.
- **Alternativa descartada:** preencher os buracos em SQL (`generate_series` com `lateral`). Duplicaria a regra de tolerância que já está testada em TS.

### 2. Variação fora do mês atual (D6)

`balanceChange = null` quando `month` não é o mês atual em São Paulo. A curva do mês pedido continua.

### 3. Estorno reduz a despesa (D2)

Nova regra em `transactionTypeCondition`:

| Tipo | Condição |
|---|---|
| `transfer` | `categories.kind = 'transfer'` |
| `expense` | `categories.kind = 'expense'` (qualquer sinal) **ou** (`kind` distinto de `transfer` e `amount_cents < 0`) |
| `income` | `amount_cents > 0` e `kind` nulo ou `income` |

- **Totais:** `expenseCents = −soma(amount_cents)` das despesas. Um estorno de R$ 50 em "Compras" entra com `+5000` e baixa a despesa. `incomeCents` não o soma mais.
- **Sem mínimo de zero no total do mês:** o gasto por categoria tem mínimo de zero em cada categoria (regra dos orçamentos); o total do mês não, para que `resultado = receitas − despesas` continue sendo a soma de tudo que não é transferência. A diferença entre o total e a soma da lista de categorias só aparece num mês em que uma categoria tem só estornos (por exemplo, o estorno de uma compra do mês anterior). → Registrado na decisão do doc 03.
- **Filtro de tipo em Transações:** `type=expense` passa a trazer os estornos; `type=income` não. O resumo do filtro segue a mesma regra, então os números da lista batem com o Início.
- **Taxa de poupança:** cai junto com a receita inflada; o resultado não muda.
- **Possível duplicata, previsões e projeção:** usam o sinal do valor, não o tipo, e não mudam.

### 4. Helpers compartilhados (D9)

- `shared/percent.ts`: `percentWithOneDecimal(partCents, totalCents)` (com o cuidado de `-0` que `category-insights-calculations.ts` já tem), usado por `category-insights-calculations.ts`, `category-spending-report.ts` e `investment-groups.ts`. O percentual inteiro de `dashboard-calculations.ts` fica como está (é outra precisão).
- `shared/categories.ts` (ou o módulo de categorias): `UNCATEGORIZED_NAME = 'Sem categoria'`, usado por `dashboard-calculations.ts` e `category-insights-calculations.ts`.
- Mudança só de lugar: os testes atuais desses módulos continuam passando sem mudar o valor esperado.

## Risks / Trade-offs

- **Números do passado mudam:** a receita e a despesa de meses antigos com estorno mudam (41 casos nos dados reais). É a correção pedida; o resultado de cada mês fica igual.
- **Tolerância esconde um banco parado:** com a tolerância, um banco sem foto há 5 dias continua somando a última. É o mesmo comportamento do patrimônio; a partir de 8 dias o banco sai da soma. A tela de saúde dos dados (`add-data-health`) mostra o banco parado.
- **Mais dados lidos:** o Início passa a ler as fotos de cada conta no mês (mais 7 dias) em vez da soma por dia. Com um usuário e algumas contas, é pouco.

## Open Questions

- Saída numa categoria de receita: manter como despesa (hoje) ou reduzir a receita (espelho da D2)? Não entra nesta change.
