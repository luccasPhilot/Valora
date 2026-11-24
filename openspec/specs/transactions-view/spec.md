# transactions-view Specification

## Purpose
Consulta paginada e filtrada de transações, detalhe, troca de categoria com aprendizado ("Aplicar sempre") e a tela de Transações: lista agrupada por dia, filtros, busca, detalhe em painel, layout em colunas no computador, estados e responsividade.
## Requirements
### Requirement: Lista paginada de transações
`GET /api/v1/transactions` MUST devolver as transações ordenadas por data (mais recente primeiro) e, na mesma data, pela criação mais recente. A resposta MUST trazer `items` e `pagination` (`page`, `limit`, `total`). O `limit` padrão MUST ser 50 e o máximo 100. Sem filtro de período, MUST devolver o mês atual (fuso de São Paulo).

#### Scenario: Sem filtros
- **WHEN** `GET /api/v1/transactions` é chamado em 4 de novembro de 2026
- **THEN** a resposta traz as transações de 1º a 30 de novembro de 2026, com `limit` 50

#### Scenario: Limite acima do máximo
- **WHEN** a requisição pede `limit=500`
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"`

### Requirement: Filtros e busca
A lista MUST aceitar os filtros `from` e `to` (datas), `categoryId`, `type` (`income`, `expense`, `transfer`), `accountId` e `search`. A busca MUST comparar o termo normalizado com `description_normalized` e encontrar o termo em qualquer parte da descrição. O tipo MUST ser decidido pela categoria (`transfer` e `expense`) e, fora delas, pelo sinal do valor: uma entrada numa categoria de despesa (estorno) é `expense`.

#### Scenario: Busca sem acento
- **WHEN** a busca é `farmacia` e existe a transação `FARMÁCIA SÃO JOÃO`
- **THEN** a transação aparece no resultado

#### Scenario: Filtro de despesas
- **WHEN** `type=expense` é pedido
- **THEN** aparecem as transações com valor negativo que não estão numa categoria `transfer` e as transações de qualquer sinal numa categoria `expense`

#### Scenario: Estorno no filtro de receitas
- **WHEN** `type=income` é pedido e existe um estorno de R$ 50,00 em "Compras"
- **THEN** o estorno não aparece

#### Scenario: Filtro de transferências
- **WHEN** `type=transfer` é pedido
- **THEN** só aparecem transações em categorias do tipo `transfer`

### Requirement: Dados de cada transação
Cada item MUST trazer:
- `id`, `date`, `description`, `amountCents`;
- `status` e `source`;
- a categoria (id, nome, ícone, tipo), ou nulo;
- `categorySource`;
- a conta (id, nome, tipo);
- a parcela (`installmentNumber`, `installmentTotal`), quando houver.

O JSON bruto do Pluggy MUST NOT ser exposto.

#### Scenario: Parcela
- **WHEN** a transação é a parcela 3 de 10
- **THEN** o item traz `installmentNumber: 3` e `installmentTotal: 10`

### Requirement: Detalhe da transação
`GET /api/v1/transactions/:id` MUST devolver a transação com os mesmos campos da lista. Um id inexistente MUST responder 404 com `code: "NOT_FOUND"`.

#### Scenario: Transação inexistente
- **WHEN** o detalhe é pedido para um id que não existe
- **THEN** a resposta é 404 com `code: "NOT_FOUND"`

### Requirement: Trocar a categoria
`PATCH /api/v1/transactions/:id` com `categoryId` MUST gravar a categoria com `category_source = 'user'`. Com `applyAlways: true`, MUST também chamar o aprendizado da categorização, que cria ou atualiza a regra para a descrição. Uma categoria arquivada MUST ser recusada.

#### Scenario: Correção simples
- **WHEN** você troca a categoria de uma transação para "Lazer" sem "Aplicar sempre"
- **THEN** a transação fica em "Lazer" com `category_source = 'user'` e nenhuma regra é criada

#### Scenario: Aplicar sempre
- **WHEN** você troca a categoria de `PAG*JOSEDASILVA` para "Mercado" com "Aplicar sempre"
- **THEN** a transação fica em "Mercado" com `category_source = 'user'`, existe a regra "igual a PAG*JOSEDASILVA → Mercado", e as outras transações com essa descrição, sem categoria do usuário, passam para "Mercado"

#### Scenario: Correção sobrevive à sincronização
- **WHEN** a sincronização roda depois da sua correção
- **THEN** a transação continua na categoria que você escolheu

#### Scenario: Categoria arquivada
- **WHEN** a troca pede uma categoria arquivada
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"`

### Requirement: Lista agrupada por dia
A tela MUST agrupar as transações por dia, com cabeçalho "Hoje", "Ontem" ou a data por extenso, e o total do dia à direita, sem as transferências. Cada item MUST mostrar:
- o ícone da categoria;
- a descrição, cortada com reticências quando não couber;
- "categoria · conta";
- o valor com sinal;
- a parcela como badge, quando houver.

Receitas MUST aparecer em `positive` com `+`. Despesas MUST aparecer na cor normal, com `−`. Transferências MUST aparecer em `muted-foreground` com ícone de setas. Transação sem categoria MUST mostrar "Sem categoria".

#### Scenario: Despesa
- **WHEN** a lista mostra uma compra de R$ 89,90
- **THEN** o valor aparece como `− R$ 89,90` na cor normal do texto

#### Scenario: Valores ocultos
- **WHEN** o ocultar valores está ligado
- **THEN** todos os valores e totais do dia mostram `R$ ••••`

### Requirement: Carregar mais
A tela MUST carregar a próxima página quando você chega perto do fim da lista, e MUST mostrar quando não há mais transações no período.

#### Scenario: Fim do período
- **WHEN** todas as transações do período já foram carregadas
- **THEN** a lista termina com uma linha dizendo que não há mais transações neste período

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

### Requirement: Detalhe e troca de categoria na tela
Tocar numa transação MUST abrir o detalhe: painel vindo de baixo abaixo de 768 px, painel lateral de 768 a 1023 px, diálogo a partir de 1024 px. O detalhe MUST mostrar todos os dados da transação e permitir trocar a categoria por uma busca de categorias. A busca MUST mostrar só categorias ativas e oferecer a opção "Aplicar sempre para '<descrição>'".

#### Scenario: Trocar categoria pelo detalhe
- **WHEN** você escolhe "Mercado" no detalhe com a opção "Aplicar sempre" marcada
- **THEN** o detalhe fecha, um aviso confirma a troca e a lista mostra a transação em "Mercado"

### Requirement: Layout no computador
A partir de 1024 px, cada transação MUST ocupar uma linha com as colunas data, descrição, categoria, conta e valor, com o valor alinhado à direita e números de largura fixa.

#### Scenario: Tela larga
- **WHEN** a tela é aberta com 1440 px de largura
- **THEN** as transações aparecem em linhas com as cinco colunas

### Requirement: Estados e responsividade
A tela MUST ter os estados carregando (skeleton da lista), vazio e erro, e MUST funcionar sem rolagem horizontal em 320, 390, 768, 1024 e 1440 px, nos temas claro e escuro.

#### Scenario: Mês sem transações
- **WHEN** o período escolhido não tem transações
- **THEN** a tela mostra o estado vazio "Nenhuma transação neste período" com a ação "Mudar período"

### Requirement: Uma rolagem só no detalhe da transação
O painel de detalhes da transação MUST ser a única área com rolagem: a lista de categorias de "Trocar categoria" MUST NOT ter altura limitada nem rolagem própria. A busca de categoria MUST continuar filtrando a lista.

#### Scenario: Trocar categoria
- **WHEN** o usuário abre os detalhes de uma transação
- **THEN** a lista de categorias cresce com o conteúdo e só o painel tem barra de rolagem

#### Scenario: Buscar categoria
- **WHEN** o usuário digita "merc" em "Buscar categoria"
- **THEN** a lista mostra só as categorias que contêm "merc", sem rolagem própria

