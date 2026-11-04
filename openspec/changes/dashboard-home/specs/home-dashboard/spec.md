## ADDED Requirements

### Requirement: Saldo total e evolução
`GET /api/v1/dashboard?month=AAAA-MM` MUST devolver:
- `totalBalanceCents`, com a mesma definição da tela de Contas (corrente + poupança não ocultas);
- `balanceEvolution`: a soma diária das fotos de saldo dessas contas, de cada dia do mês que tiver foto;
- `balanceChange` (`cents` e `percent`): a diferença entre o saldo de hoje e o da primeira foto do mês, ou nulo se não houver foto de um dia anterior a hoje no mês.

Sem `month`, MUST usar o mês atual no fuso de São Paulo.

#### Scenario: Variação no mês
- **WHEN** a primeira foto de novembro soma R$ 4.000,00 e o saldo de hoje é R$ 4.850,32
- **THEN** `balanceChange.cents` é `85032`

#### Scenario: Primeiro dia com dados
- **WHEN** a única foto do mês é a de hoje
- **THEN** `balanceChange` é nulo

### Requirement: Receitas e despesas
A resposta MUST trazer:
- `monthIncomeCents` e `monthExpenseCents` do mês;
- `incomeVsExpense` com os mesmos dois valores para cada um dos 6 meses até o mês pedido, inclusive.

Os totais MUST incluir transações do Open Finance e manuais (inclusive pendentes) e MUST excluir categorias do tipo `transfer`. Despesas MUST vir como valor positivo.

#### Scenario: Pagamento de fatura fora
- **WHEN** o mês tem R$ 2.000,00 de compras no cartão e o pagamento da fatura de R$ 1.500,00 em "Pagamento de fatura"
- **THEN** `monthExpenseCents` é `200000`

#### Scenario: Gasto em dinheiro
- **WHEN** existe uma despesa manual de R$ 12,50 em "Dinheiro" no mês
- **THEN** ela está somada em `monthExpenseCents`

#### Scenario: Seis meses
- **WHEN** o mês pedido é novembro de 2026
- **THEN** `incomeVsExpense` traz junho a novembro de 2026, em ordem, com zero nos meses sem transações

### Requirement: Gastos por categoria
`spendingByCategory` MUST trazer as 5 categorias de despesa com maior gasto líquido no mês (mesma regra de gasto dos orçamentos), com nome, ícone, valor e percentual do total de despesas. O resto MUST ir para um item "Outros". Despesas sem categoria MUST aparecer como "Sem categoria" e entrar na disputa pelas 5 maiores.

#### Scenario: Mais de 5 categorias
- **WHEN** o mês tem gastos em 8 categorias
- **THEN** a lista traz as 5 maiores e "Outros" com a soma das outras 3

#### Scenario: Até 5 categorias
- **WHEN** o mês tem gastos em 3 categorias
- **THEN** a lista traz as 3, sem "Outros"

### Requirement: Orçamentos e últimas transações
A resposta MUST trazer `budgetsNearLimit` (os 3 orçamentos do mês com maior percentual gasto, com o status de `budgetStatus`) e `latestTransactions` (as 5 transações mais recentes, de qualquer tipo e origem).

#### Scenario: Sem orçamentos
- **WHEN** o mês não tem orçamentos
- **THEN** `budgetsNearLimit` é uma lista vazia

### Requirement: Tela Início
Logo abaixo do topo de tela (título e status da sincronização, vindos do shell), a tela MUST mostrar, nesta ordem no celular:
1. card de saldo (`secondary`, `radius-xl`), com o saldo total em `display`, a variação no mês quando houver, e um gráfico de área pequeno com a evolução;
2. atalhos redondos "Adicionar receita", "Registrar despesa", "Transações" e "Orçamentos";
3. receitas e despesas do mês, lado a lado;
4. gráfico de receitas x despesas;
5. gastos por categoria;
6. orçamentos perto do limite;
7. últimas 5 transações, com "Ver todas".

A tela MUST NOT ter saudação.

#### Scenario: Atalho de despesa
- **WHEN** você toca em "Registrar despesa"
- **THEN** o formulário de nova transação abre com o tipo Despesa escolhido

#### Scenario: Depois de lançar
- **WHEN** você salva uma despesa pelo atalho
- **THEN** os números do Início são recarregados e a despesa aparece nas últimas transações

### Requirement: Gráficos
Os gráficos do Início MUST seguir estas regras:

- **Receitas x despesas:** barras agrupadas por mês, com receitas no slot 1 e despesas no slot 2 da paleta de gráficos, legenda, eixo com valores compactos e meses abreviados no celular.
- **Gastos por categoria:** lista de barras horizontais numa cor só (`primary`), com "Outros" em `chart-other`, sem cor por categoria.
- **Todos os gráficos:**
  - texto de valores e rótulos na cor de texto, nunca na cor da série;
  - tooltip ao tocar ou passar o mouse, com valores em R$;
  - um resumo em texto para leitor de tela.

#### Scenario: Toque numa barra
- **WHEN** você toca na barra de outubro no gráfico de receitas x despesas
- **THEN** aparece o tooltip com outubro, a receita e a despesa em R$

#### Scenario: Toque numa categoria
- **WHEN** você toca em "Mercado" na lista de gastos por categoria
- **THEN** a tela de Transações abre filtrada por "Mercado" no mês

### Requirement: Layout responsivo
O Início MUST ter uma coluna abaixo de 768 px, duas colunas de 768 a 1023 px e, a partir de 1024 px, uma grade de 12 colunas com até 1200 px:
- primeira linha: card de saldo e números do mês;
- segunda linha: gráfico e categorias;
- terceira linha: orçamentos e transações.

O Início MUST funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Celular pequeno
- **WHEN** o Início é aberto com 320 px
- **THEN** os blocos ficam em uma coluna, os gráficos ocupam a largura do card, e nenhum valor em dinheiro é cortado

### Requirement: Estados
O Início MUST ter:
- carregando (skeleton de cada bloco);
- erro (por bloco ou geral, com "Tentar de novo");
- primeiro uso: quando nunca houve sincronização, explicar como conectar os bancos no Meu Pluggy, com o botão de sincronizar.

Blocos sem dados no mês MUST mostrar um estado vazio próprio, por exemplo "Nenhum gasto neste mês". Todos os valores MUST respeitar o ocultar valores.

#### Scenario: Primeiro uso
- **WHEN** o Início é aberto antes da primeira sincronização
- **THEN** a tela mostra o estado de primeiro uso, sem números inventados

#### Scenario: Valores ocultos
- **WHEN** o ocultar valores está ligado
- **THEN** o saldo, os números do mês, as categorias, os orçamentos e as transações mostram `R$ ••••`, e os tooltips dos gráficos também
