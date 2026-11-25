# home-dashboard Specification

## Purpose
Números agregados da tela Início (saldo total e evolução, receitas e despesas, gastos por categoria, orçamentos perto do limite e últimas transações), os gráficos, os atalhos de lançamento e os estados da tela.
## Requirements
### Requirement: Saldo total e evolução
`GET /api/v1/dashboard?month=AAAA-MM` MUST devolver:
- `totalBalanceCents`, com a mesma definição da tela de Contas (corrente + poupança não ocultas, de bancos ativos);
- `balanceEvolution`: um ponto para cada dia do mês que tiver foto de alguma dessas contas, com o saldo do dia calculado conta a conta: cada conta vale a sua foto mais recente até o dia, com no máximo 7 dias. Entram também as contas corrente e poupança não ocultas de bancos arquivados, só nos dias **anteriores** ao dia do arquivamento (fuso de São Paulo);
- `balanceChange` (`cents` e `percent`): a diferença entre o saldo de hoje e o saldo do primeiro dia do mês com foto, calculado pela mesma regra de foto mais recente, **só com os bancos ativos**. MUST ser nulo se não houver foto de um dia anterior a hoje no mês, ou se `month` não for o mês atual.

Sem `month`, MUST usar o mês atual no fuso de São Paulo.

#### Scenario: Variação no mês
- **WHEN** a primeira foto de novembro soma R$ 4.000,00 e o saldo de hoje é R$ 4.850,32
- **THEN** `balanceChange.cents` é `85032`

#### Scenario: Primeiro dia com dados
- **WHEN** a única foto do mês é a de hoje
- **THEN** `balanceChange` é nulo

#### Scenario: Banco que falhou no dia 1
- **WHEN** a conta A tem R$ 1.000,00 nas fotos de 31/10 e de 2 a 24/11, sem foto em 01/11, a conta B tem R$ 3.000,00 em todas as fotos, e o saldo de hoje é R$ 4.000,00
- **THEN** o ponto de 01/11 vale R$ 4.000,00 e `balanceChange.cents` é `0`, sem os R$ 1.000,00 da conta A como ganho

#### Scenario: Foto antiga demais
- **WHEN** a última foto da conta A antes de 10/11 é de 01/11
- **THEN** a conta A fica fora do ponto de 10/11

#### Scenario: Passado do banco arquivado
- **WHEN** um banco com R$ 1.000,00 em todas as fotos de novembro é arquivado no dia 10
- **THEN** a evolução soma esses R$ 1.000,00 nos dias 1 a 9 e não soma a partir do dia 10

#### Scenario: Variação sem o banco arquivado
- **WHEN** um banco com R$ 1.000,00 é arquivado no dia 10 e o saldo dos bancos ativos foi de R$ 4.000,00 (dia 1) a R$ 4.850,32 (hoje)
- **THEN** `balanceChange.cents` é `85032`, sem uma queda de R$ 1.000,00

#### Scenario: Mês passado
- **WHEN** a requisição pede `month=2026-10` em novembro de 2026
- **THEN** `balanceEvolution` traz os dias de outubro com foto e `balanceChange` é nulo

### Requirement: Receitas e despesas
A resposta MUST trazer:
- `monthIncomeCents` e `monthExpenseCents` do mês;
- `incomeVsExpense` com os mesmos dois valores para cada um dos 6 meses até o mês pedido, inclusive.

Os totais MUST incluir transações do Open Finance e manuais (inclusive pendentes) e MUST excluir categorias do tipo `transfer`. Despesa MUST ser toda transação numa categoria do tipo `expense`, qualquer que seja o sinal, e toda saída sem categoria; uma entrada numa categoria de despesa (estorno) MUST reduzir a despesa e MUST NOT contar como receita. Receita MUST ser toda entrada numa categoria do tipo `income` ou sem categoria. Despesas MUST vir como valor positivo, sem mínimo de zero no total do mês.

#### Scenario: Pagamento de fatura fora
- **WHEN** o mês tem R$ 2.000,00 de compras no cartão e o pagamento da fatura de R$ 1.500,00 em "Pagamento de fatura"
- **THEN** `monthExpenseCents` é `200000`

#### Scenario: Gasto em dinheiro
- **WHEN** existe uma despesa manual de R$ 12,50 em "Dinheiro" no mês
- **THEN** ela está somada em `monthExpenseCents`

#### Scenario: Estorno
- **WHEN** o mês tem uma compra de R$ 200,00 e um estorno de R$ 50,00 em "Compras", e um salário de R$ 5.000,00 em "Salário"
- **THEN** `monthExpenseCents` é `15000` e `monthIncomeCents` é `500000`

#### Scenario: Entrada sem categoria
- **WHEN** chega uma entrada de R$ 300,00 sem categoria
- **THEN** ela soma em `monthIncomeCents`

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
O Início MUST ter uma coluna abaixo de 768 px, duas colunas de 768 a 1023 px e, a partir de 1024 px, uma grade de 12 colunas com a largura máxima do conteúdo definida em "Navegação por menu lateral":
- primeira linha: card de saldo e números do mês (receitas, despesas e resultado);
- segunda linha: gráfico e categorias;
- terceira linha: orçamentos e transações.

O Início MUST funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Celular pequeno
- **WHEN** o Início é aberto com 320 px
- **THEN** os blocos ficam em uma coluna, os gráficos ocupam a largura do card, e nenhum valor em dinheiro é cortado

#### Scenario: Computador sem cards vazios
- **WHEN** o Início é aberto com 1440 px e mouse
- **THEN** os cards de receitas, despesas e resultado têm a mesma altura e juntos ocupam a altura dos blocos de saldo e atalhos, sem espaço vazio dentro deles

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

### Requirement: Resumo da projeção no Início
`GET /api/v1/dashboard` MUST trazer `projection` com `projectedBalanceCents`, `lowestBalanceCents`, `lowestBalanceDate` e `hasPlannedItems`, com os mesmos valores de `GET /api/v1/projection`, quando o mês pedido for o mês atual em São Paulo. Para qualquer outro mês, `projection` MUST ser `null`. A resposta MUST manter todos os campos que já existiam.

#### Scenario: Mesmo número da projeção
- **WHEN** a projeção completa tem saldo projetado de `480000`
- **THEN** `projection.projectedBalanceCents` é `480000`

#### Scenario: Mês passado
- **WHEN** o Início é pedido para um mês anterior ao atual
- **THEN** `projection` é `null`

#### Scenario: Nada previsto
- **WHEN** não há ocorrência pendente nem fatura no período
- **THEN** `hasPlannedItems` é falso

### Requirement: Resumo de metas no Início
`GET /api/v1/dashboard` MUST trazer `goals` com até 3 metas não concluídas, na mesma ordem da tela de Metas (prazo mais próximo primeiro, sem prazo por último), cada uma com progresso, valores, situação e estimativa iguais aos de `GET /api/v1/goals`, e `activeCount` com o total de metas não concluídas. Metas concluídas MUST NOT entrar.

#### Scenario: Mais de três metas
- **WHEN** existem 5 metas não concluídas
- **THEN** `goals.items` traz as 3 de prazo mais próximo e `activeCount` vale 5

#### Scenario: Só metas concluídas
- **WHEN** todas as metas foram atingidas
- **THEN** `goals.items` fica vazio e `activeCount` vale 0

#### Scenario: Mesmos números da tela de Metas
- **WHEN** uma meta tem progresso de 40% e situação `behind` em `GET /api/v1/goals`
- **THEN** o Início traz a mesma meta com 40% e `behind`

### Requirement: Cartão de projeção no Início
A tela Início MUST mostrar o cartão "Projeção do fim do mês" com o saldo projetado em destaque e o link "Ver planejamento". Quando o menor saldo for negativo, MUST mostrar o aviso com a data, com ícone e texto, em `destructive`. Quando `hasPlannedItems` for falso, MUST mostrar o estado vazio "Planeje o mês" com a ação para o Planejamento. Quando `projection` for `null`, o cartão MUST NOT aparecer.

#### Scenario: Saldo negativo no caminho
- **WHEN** o menor saldo é `-50000` no dia 20
- **THEN** o cartão mostra "Saldo negativo em 20/11" com ícone

#### Scenario: Tudo positivo
- **WHEN** o menor saldo é positivo
- **THEN** o cartão não usa vermelho

#### Scenario: Nada previsto
- **WHEN** `hasPlannedItems` é falso
- **THEN** o cartão mostra "Planeje o mês" com a ação para o Planejamento

### Requirement: Cartão de metas no Início
A tela Início MUST mostrar o cartão "Metas" com até 3 metas (ícone, nome, barra de progresso, percentual e uma frase de situação com ícone e texto) e o link "Ver metas". Sem metas, MUST mostrar o estado vazio com a ação "Criar meta".

#### Scenario: Meta atrasada
- **WHEN** uma meta está `behind`
- **THEN** a linha dela mostra o ícone e o texto da situação, sem depender só da cor

#### Scenario: Sem metas
- **WHEN** não há nenhuma meta
- **THEN** o cartão mostra o estado vazio com "Criar meta"

### Requirement: Layout e valores dos cartões novos
Os cartões novos MUST seguir a grade do Início (1 coluna no celular, 2 no tablet, 12 no computador), funcionar de 320 px a 1440 px nos dois temas sem rolagem horizontal e respeitar "Ocultar valores". MUST usar o skeleton do Início enquanto carregam.

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o saldo projetado e os valores das metas aparecem mascarados

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px
- **THEN** os cartões ficam em uma coluna, sem rolagem horizontal

### Requirement: Resumo do patrimônio no Início
`GET /api/v1/dashboard` MUST trazer `netWorth` com `totalCents`, `investmentsCents`, `openBillsCents` e `change` (`{ cents, percent }` ou nulo), com os mesmos valores de `GET /api/v1/net-worth` (`current` e `monthChange`), quando o mês pedido for o mês atual em São Paulo. Para qualquer outro mês, `netWorth` MUST ser `null`. A resposta MUST manter todos os campos que já existiam, e `totalBalanceCents` MUST continuar sendo só corrente e poupança.

#### Scenario: Mesmo número do patrimônio
- **WHEN** `GET /net-worth` devolve `netWorthCents` `1550000` e `monthChange.cents` `50000`
- **THEN** `netWorth.totalCents` é `1550000` e `netWorth.change.cents` é `50000`

#### Scenario: Saldo total não muda
- **WHEN** há R$ 12.000,00 em investimentos e R$ 5.000,00 em contas
- **THEN** `totalBalanceCents` continua `500000`

#### Scenario: Mês passado
- **WHEN** o Início é pedido para um mês anterior ao atual
- **THEN** `netWorth` é `null`

#### Scenario: Sem foto de dia anterior
- **WHEN** a única foto do mês é a de hoje
- **THEN** `netWorth.change` é nulo e `netWorth.totalCents` continua preenchido

### Requirement: Linha de patrimônio no card de saldo
O card de saldo MUST mostrar a linha "Patrimônio" com o valor, a variação no mês (ícone e texto, com `+` ou `−`, sem depender só da cor) e o link "Ver patrimônio" para `/investimentos`, quando `investmentsCents` ou `openBillsCents` for diferente de zero. Sem esses dois, a linha MUST NOT aparecer. O valor MUST ficar vermelho só quando negativo. MUST respeitar "Ocultar valores" (mascara os valores em reais e mantém o percentual) e MUST caber de 320 px a 1440 px nos dois temas sem rolagem horizontal.

#### Scenario: Com investimentos
- **WHEN** há R$ 12.000,00 em investimentos
- **THEN** o card mostra "Patrimônio", o valor, a variação do mês e "Ver patrimônio"

#### Scenario: Sem investimentos nem faturas
- **WHEN** `investmentsCents` e `openBillsCents` são zero
- **THEN** o card mostra só o saldo total, sem a linha de patrimônio

#### Scenario: Sem variação
- **WHEN** `netWorth.change` é nulo
- **THEN** a linha mostra o valor e o link, sem a variação

#### Scenario: Abrir o patrimônio
- **WHEN** o usuário aciona "Ver patrimônio"
- **THEN** o app abre `/investimentos`

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** o valor e a variação em reais aparecem mascarados e o percentual continua visível

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e o patrimônio é "R$ 1.234.567,89"
- **THEN** o valor não é cortado e não há rolagem horizontal

### Requirement: Resultado do mês
O Início MUST mostrar o card "Resultado do mês" junto de "Receitas do mês" e "Despesas do mês", com o valor de `monthIncomeCents` menos `monthExpenseCents`, calculado no front e sem campo novo na API. O valor MUST usar o sinal da interface (`+` quando positivo, `−` quando negativo), a cor normal do texto (nunca vermelho) e respeitar "Ocultar valores". A partir de 1024 px, os três cards MUST ficar empilhados na coluna da direita com a mesma altura, ocupando a altura dos blocos de saldo e atalhos. Abaixo de 1024 px, receitas e despesas MUST ficar lado a lado quando couberem (a partir de 400 px) e o resultado MUST ocupar a largura toda abaixo deles.

#### Scenario: Resultado positivo
- **WHEN** o mês tem `monthIncomeCents` de `500000` e `monthExpenseCents` de `200000`
- **THEN** o card "Resultado do mês" mostra `+ R$ 3.000,00`

#### Scenario: Resultado negativo
- **WHEN** o mês tem `monthIncomeCents` de `100000` e `monthExpenseCents` de `250000`
- **THEN** o card mostra `− R$ 1.500,00` na cor normal do texto

#### Scenario: Valores ocultos
- **WHEN** o usuário ativa "Ocultar valores"
- **THEN** o card "Resultado do mês" não mostra o valor

### Requirement: Contador "para revisar" no Início
`GET /api/v1/dashboard` MUST trazer `reviewCount`, o mesmo número de `GET /transactions/review-count`. Com `reviewCount` maior que zero, o Início MUST mostrar acima dos cartões o aviso "N para revisar" ("1 para revisar"), que abre a caixa "Para revisar". Com zero, o aviso MUST NOT aparecer.

#### Scenario: Transações novas
- **WHEN** a sincronização da manhã trouxe 12 transações novas
- **THEN** o Início mostra "12 para revisar"

#### Scenario: Caixa zerada
- **WHEN** o usuário revisa tudo e volta ao Início
- **THEN** o aviso não aparece

