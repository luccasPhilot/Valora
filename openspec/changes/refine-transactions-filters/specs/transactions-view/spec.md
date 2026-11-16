## MODIFIED Requirements

### Requirement: Filtros na tela
A tela MUST ter:
- busca com espera de 300 ms;
- filtro de período, com os atalhos Este mês, Mês passado, Últimos 3 meses, Este ano e Personalizado;
- um botão "Filtros" que dá acesso aos filtros de categoria, tipo, origem e conta.

A busca, o período e o botão "Filtros" MUST ficar sempre à vista. O botão MUST mostrar quantos dos filtros de categoria, tipo, origem e conta estão ativos. Filtros ativos MUST virar chips removíveis. Abaixo de 768 px, o botão "Filtros" MUST abrir um painel vindo de baixo com o período e os quatro filtros. A partir de 768 px, MUST abrir um popover com categoria, tipo, origem e conta, e a busca e o período MUST ficar numa linha acima da lista. O texto de nenhum seletor MUST aparecer cortado.

#### Scenario: Remover filtro
- **WHEN** você toca no "x" do chip "Transporte"
- **THEN** o filtro de categoria é removido e a lista recarrega

#### Scenario: Busca vazia
- **WHEN** a busca não encontra nada
- **THEN** a tela mostra o estado vazio "Nenhuma transação encontrada" com a ação "Limpar filtros"

#### Scenario: Computador com poucos filtros à vista
- **WHEN** a tela é aberta com 1440 px de largura
- **THEN** a linha acima da lista mostra só a busca, o período e o botão "Filtros", e categoria, tipo, origem e conta aparecem ao abrir o botão

#### Scenario: Contagem de filtros ativos
- **WHEN** os filtros de categoria "Transporte" e de tipo "Despesas" estão ativos
- **THEN** o botão mostra "Filtros (2)" e os dois chips aparecem abaixo

#### Scenario: Celular
- **WHEN** a tela é aberta com 390 px de largura e você toca em "Filtros"
- **THEN** um painel vindo de baixo mostra período, categoria, tipo, origem e conta

## ADDED Requirements

### Requirement: Resumo do filtro
`GET /api/v1/transactions/summary` MUST aceitar os mesmos filtros de `GET /api/v1/transactions` (`from`, `to`, `categoryId`, `type`, `accountId`, `source`, `possibleDuplicate`, `search`; sem `from` e `to`, o mês atual em São Paulo) e MUST devolver `incomeCents`, `expenseCents` e `count`. `incomeCents` e `expenseCents` MUST usar a mesma definição de receita e despesa do Início, sem transferências internas, com lançamentos manuais e transações pendentes, e `expenseCents` MUST vir positivo. `count` MUST ser o número de transações do filtro, igual a `pagination.total` da lista. A tela MUST mostrar logo acima da lista, abaixo dos filtros e chips, o número de transações, as receitas com `+` em `positive` e as despesas com `−` na cor normal. Com `type=transfer`, a tela MUST mostrar só o número de transações e dizer que transferências não entram nos totais de receita e despesa.

#### Scenario: Resumo do mês
- **WHEN** o mês tem receitas de 850000 centavos, despesas de 421530 centavos e 38 transações
- **THEN** a tela mostra "38 transações", `+ R$ 8.500,00` e `− R$ 4.215,30`

#### Scenario: Filtro de categoria
- **WHEN** a categoria "Transporte" está filtrada e tem 6 despesas que somam 75000 centavos
- **THEN** o resumo mostra "6 transações" e `− R$ 750,00`, e a receita não aparece

#### Scenario: Mesma regra do Início
- **WHEN** o período filtrado é o mês atual, sem outros filtros
- **THEN** `incomeCents` e `expenseCents` são iguais a `monthIncomeCents` e `monthExpenseCents` do Início

#### Scenario: Transferências fora dos totais
- **WHEN** o período tem o pagamento de uma fatura de 120000 centavos em categoria de transferência
- **THEN** o valor não entra em `incomeCents` nem em `expenseCents`, mas entra em `count`

#### Scenario: Filtro de transferências
- **WHEN** `type=transfer` está ativo
- **THEN** a tela mostra só o número de transações e a nota de que transferências não entram nos totais

#### Scenario: Valores ocultos
- **WHEN** o ocultar valores está ligado
- **THEN** receitas e despesas do resumo mostram `R$ ••••` e o número de transações continua visível

#### Scenario: Erro no resumo
- **WHEN** a requisição do resumo falha e a da lista funciona
- **THEN** a lista continua na tela e o resumo mostra "Tentar de novo"

#### Scenario: Sem transações
- **WHEN** o filtro não encontra nenhuma transação
- **THEN** o resumo não aparece e a tela mostra o estado vazio da lista
