## Why

A revisão de 18/11/2026 (`docs/08-revisao-e-proximas-fases.md`) achou dois números do Início que ficam errados em casos comuns:

- **D1, Alta:** a curva e a variação do saldo do Início somam as fotos de cada dia (`sum(balance_cents) group by date`). Se um banco falha no dia 1, a primeira foto do mês não tem aquele banco, e a variação do mês trata o saldo inteiro dele como ganho. O patrimônio já resolve isso com a tolerância de 7 dias (`valueOnDay`).
- **D2, Média:** um estorno (entrada positiva numa categoria de despesa) conta como **receita** no Início e nos relatórios, mas **reduz o gasto** nos orçamentos e nos gastos por categoria. Uma compra de R$ 200 com estorno de R$ 50 aparece como despesa de R$ 200 e receita de R$ 50, o que infla a receita e a taxa de poupança. Nos dados reais há 41 casos (17 nos últimos 6 meses). **Decisão do usuário em 24/11/2026: o estorno reduz a despesa.**

Junto vem a D9 (lógica duplicada), que em parte some com a D1, e a D6 (variação incoerente num mês passado), que mora no mesmo método.

## What Changes

- **Saldo do Início com a foto que faltou (D1):** a curva e a variação do saldo passam a usar as funções do patrimônio (`valueOnDay`), só com as contas que entram no saldo total (corrente e poupança não ocultas). Cada conta vale a foto mais recente até o dia, com no máximo 7 dias. Um banco que falhou no dia 1 entra com a foto do dia 31 do mês anterior.
- **Estorno reduz a despesa (D2):** passa a ser despesa toda transação numa categoria de **despesa**, qualquer que seja o sinal, e toda saída sem categoria. Receita fica sendo a entrada numa categoria de receita ou sem categoria. O estorno de R$ 50 deixa de ser receita e baixa a despesa do mês para R$ 150, o mesmo número dos gastos por categoria. O resultado do mês não muda: só a divisão entre receita e despesa. Vale para o Início, os relatórios, o resumo e o filtro de tipo de Transações, que já leem uma definição só (`transactionTypeCondition`).
- **Lógica duplicada (D9):** "banco arquivado antes do dia" deixa de existir em SQL (`DashboardRepository`) e fica só em `net-worth-calculations.ts`. O percentual com uma casa decimal e o nome "Sem categoria" passam para `shared/`, usados pelos módulos que hoje repetem cada um.
- **Mês passado no Início (D6):** `balanceChange` fica nulo quando `month` não é o mês atual. Hoje compara o saldo de hoje com a foto daquele mês. O front não manda `month`, então nada muda na tela.

### Contraria documentos (decisão do usuário, tomada em 24/11/2026)

- `docs/03-arquitetura.md`, contrato de `GET /transactions`: "`type` é decidido pela categoria (`transfer`) e, fora dela, pelo sinal do valor" passa a "pela categoria (`transfer` e `expense`) e, fora delas, pelo sinal".
- `docs/01-produto.md`: as definições de receita e despesa do Início e dos relatórios ganham a regra do estorno.
- Specs `home-dashboard`, `reports` e `transactions-view`: o tipo pelo sinal.

### Fora do escopo

- **Saída numa categoria de receita** (por exemplo, a devolução de um salário pago a mais). Continua despesa, pelo sinal, como hoje. Tratar como "reduz a receita" seria o espelho da D2, mas não foi decidido. Fica anotado nas questões em aberto.
- D4 (consultas repetidas do `GET /dashboard`), D5, D7, D8, D10 a D13.
- Mudar a curva do patrimônio: ela já usa a tolerância.
- Mudança de tela: o front mostra os mesmos campos, só com números certos.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é a change nº 3 da "Ordem sugerida" de `docs/08` (D1, D9 e D2), mais a D6. Ao arquivar, D1, D2, D6 e D9 são marcados como resolvidos em `docs/08`, e a D2 sai de "Decisões que dependem de você".

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-dashboard`: a evolução e a variação do saldo valem a foto mais recente de cada conta (até 7 dias); variação nula fora do mês atual; receitas e despesas com a regra do estorno.
- `reports`: o histórico de receitas e despesas usa a regra do estorno.
- `transactions-view`: o filtro de tipo decide pela categoria de despesa além da de transferência.

## Impact

- **Backend:** `modules/dashboard/` (`dashboard.service.ts`, `dashboard.repository.ts`, `dashboard-calculations.ts`), `modules/net-worth/` (leitura das fotos só das contas e uma função para a curva do saldo), `modules/transactions/transaction-type-filter.ts`, `modules/reports/category-spending-report.ts`, `modules/investments/investment-groups.ts`, `modules/category-insights/category-insights-calculations.ts` e `shared/` (percentual e "Sem categoria").
- **Frontend:** nada muda no contrato. Conferir o texto do Início e dos relatórios que explica receita e despesa, se houver.
- **Testes:** unitários da curva com foto faltando; integração do `GET /dashboard`, dos relatórios e do filtro de tipo com estorno; os testes atuais de receita e despesa com estorno mudam de valor esperado.
- **Banco:** nenhuma migration.
- **Documentação:** `docs/01-produto.md`, `docs/03-arquitetura.md` e `docs/08-revisao-e-proximas-fases.md`.
