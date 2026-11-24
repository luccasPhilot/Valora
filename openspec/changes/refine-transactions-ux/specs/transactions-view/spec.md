## MODIFIED Requirements

### Requirement: Lista agrupada por dia
A tela MUST agrupar as transações por dia, com cabeçalho "Hoje", "Ontem" ou a data por extenso, e o total do dia à direita, sem as transferências. Com o filtro de tipo em transferências, o cabeçalho MUST mostrar a quantidade do dia ("1 transferência", "3 transferências") no lugar do total. Cada item MUST mostrar:
- o ícone da categoria;
- a descrição, em até duas linhas, cortada com reticências só depois da segunda;
- "categoria · conta" (abaixo de 360 px, só a categoria);
- o valor com sinal;
- a parcela como badge, quando houver.

Receitas MUST aparecer em `positive` com `+`. Despesas MUST aparecer na cor normal, com `−`. Transferências MUST aparecer em `muted-foreground` com ícone de setas. Transação sem categoria MUST mostrar "Sem categoria". Em 320 px, o título da tela e o status da sincronização MUST aparecer inteiros, com o status abaixo do título.

#### Scenario: Despesa
- **WHEN** a lista mostra uma compra de R$ 89,90
- **THEN** o valor aparece como `− R$ 89,90` na cor normal do texto

#### Scenario: Valores ocultos
- **WHEN** o ocultar valores está ligado
- **THEN** todos os valores e totais do dia mostram `R$ ••••`

#### Scenario: Dia só com transferências filtradas
- **WHEN** o filtro de tipo é "Transferências" e o dia 05/11 tem 3 pagamentos de fatura
- **THEN** o cabeçalho de 05/11 mostra "3 transferências", e não "R$ 0,00"

#### Scenario: Celular de 320 px
- **WHEN** a tela é aberta com 320 px de largura
- **THEN** o título "Transações" aparece inteiro, o status da sincronização fica abaixo dele, e uma descrição longa ocupa até duas linhas

### Requirement: Filtros na tela
A tela MUST ter:
- busca com espera de 300 ms;
- filtro de período, com os atalhos Este mês, Mês passado, Últimos 3 meses, Este ano e Personalizado;
- um botão "Filtros" que dá acesso aos filtros de categoria, tipo, origem e conta.

A busca, o período e o botão "Filtros" MUST ficar sempre à vista. Filtros ativos de categoria, tipo, origem e conta MUST virar chips removíveis com o nome do filtro ("Categoria: Transporte"); o período MUST NOT virar chip. Abaixo de 768 px, o botão "Filtros" MUST abrir um painel vindo de baixo com o período e os quatro filtros, MUST contar o período quando ele não for "Este mês", e o botão de confirmar do painel MUST dizer quantas transações o filtro traz ("Ver 38 transações"). A partir de 768 px, MUST abrir um popover com categoria, tipo, origem e conta e o botão "Limpar filtros", a busca e o período MUST ficar numa linha acima da lista, e a contagem do botão MUST NOT incluir o período. O texto de nenhum seletor MUST aparecer cortado.

#### Scenario: Remover filtro
- **WHEN** você toca no "x" do chip "Categoria: Transporte"
- **THEN** o filtro de categoria é removido e a lista recarrega

#### Scenario: Busca vazia
- **WHEN** a busca não encontra nada
- **THEN** a tela mostra o estado vazio "Nenhuma transação encontrada" com a ação "Limpar filtros"

#### Scenario: Computador com poucos filtros à vista
- **WHEN** a tela é aberta com 1440 px de largura
- **THEN** a linha acima da lista mostra só a busca, o período e o botão "Filtros", e categoria, tipo, origem e conta aparecem ao abrir o botão

#### Scenario: Contagem de filtros ativos no computador
- **WHEN** os filtros de categoria "Transporte" e de tipo "Despesas" estão ativos e o período é "Mês passado", com 1440 px
- **THEN** o botão mostra "Filtros (2)" e os chips "Categoria: Transporte" e "Tipo: Despesas" aparecem abaixo

#### Scenario: Contagem com o período no celular
- **WHEN** o filtro de categoria "Transporte" está ativo e o período é "Mês passado", com 390 px
- **THEN** o botão mostra "Filtros (2)"

#### Scenario: Limpar no popover
- **WHEN** você aciona "Limpar filtros" no popover
- **THEN** categoria, tipo, origem e conta são removidos e o período continua o mesmo

#### Scenario: Celular
- **WHEN** a tela é aberta com 390 px de largura e você toca em "Filtros"
- **THEN** um painel vindo de baixo mostra período, categoria, tipo, origem e conta, e o botão de confirmar diz quantas transações o filtro traz

### Requirement: Resumo do filtro
`GET /api/v1/transactions/summary` MUST aceitar os mesmos filtros de `GET /api/v1/transactions` (`from`, `to`, `categoryId`, `type`, `accountId`, `source`, `possibleDuplicate`, `search`; sem `from` e `to`, o mês atual em São Paulo) e MUST devolver `incomeCents`, `expenseCents` e `count`. `incomeCents` e `expenseCents` MUST usar a mesma definição de receita e despesa do Início, sem transferências internas, com lançamentos manuais e transações pendentes, e `expenseCents` MUST vir positivo. `count` MUST ser o número de transações do filtro, igual a `pagination.total` da lista. A tela MUST mostrar logo acima da lista, abaixo dos filtros e chips, no tamanho do texto do corpo: o período do filtro, o número de transações, "Receitas" com o valor com `+` em `positive` e "Despesas" com o valor com `−` na cor normal, com os rótulos visíveis. Quando o filtro mudar, o resumo novo MUST ser anunciado aos leitores de tela sem tirar o foco. Com `type=transfer`, a tela MUST mostrar só o período e o número de transações e dizer que transferências não entram nos totais de receita e despesa.

#### Scenario: Resumo do mês
- **WHEN** o mês de novembro de 2026 tem receitas de 850000 centavos, despesas de 421530 centavos e 38 transações
- **THEN** a tela mostra "Novembro de 2026", "38 transações", "Receitas + R$ 8.500,00" e "Despesas − R$ 4.215,30"

#### Scenario: Filtro de categoria
- **WHEN** a categoria "Transporte" está filtrada e tem 6 despesas que somam 75000 centavos
- **THEN** o resumo mostra "6 transações" e "Despesas − R$ 750,00", e a receita não aparece

#### Scenario: Mesma regra do Início
- **WHEN** o período filtrado é o mês atual, sem outros filtros
- **THEN** `incomeCents` e `expenseCents` são iguais a `monthIncomeCents` e `monthExpenseCents` do Início

#### Scenario: Transferências fora dos totais
- **WHEN** o período tem o pagamento de uma fatura de 120000 centavos em categoria de transferência
- **THEN** o valor não entra em `incomeCents` nem em `expenseCents`, mas entra em `count`

#### Scenario: Filtro de transferências
- **WHEN** `type=transfer` está ativo
- **THEN** a tela mostra só o período, o número de transações e a nota de que transferências não entram nos totais

#### Scenario: Anúncio da mudança
- **WHEN** o usuário troca o período para "Mês passado"
- **THEN** o leitor de tela anuncia o resumo novo uma vez, sem mover o foco

#### Scenario: Valores ocultos
- **WHEN** o ocultar valores está ligado
- **THEN** receitas e despesas do resumo mostram `R$ ••••` na cor normal e o número de transações continua visível

#### Scenario: Erro no resumo
- **WHEN** a requisição do resumo falha e a da lista funciona
- **THEN** a lista continua na tela e o resumo mostra "Tentar de novo"

#### Scenario: Sem transações
- **WHEN** o filtro não encontra nenhuma transação
- **THEN** o resumo não aparece e a tela mostra o estado vazio da lista
