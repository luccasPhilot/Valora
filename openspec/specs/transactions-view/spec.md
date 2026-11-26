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
`PATCH /api/v1/transactions/:id` com `categoryId` MUST gravar a categoria com `category_source = 'user'` e marcar a transação como revisada. Com `applyAlways: true`, MUST também chamar o aprendizado da categorização, que cria ou atualiza a regra para a descrição. Uma categoria arquivada MUST ser recusada. A resposta MUST trazer `ruleSuggestion`: a regra sugerida para a descrição da transação, ou nulo.

#### Scenario: Correção simples
- **WHEN** você troca a categoria de uma transação para "Lazer" sem "Aplicar sempre"
- **THEN** a transação fica em "Lazer" com `category_source = 'user'`, revisada, e nenhuma regra é criada

#### Scenario: Aplicar sempre
- **WHEN** você troca a categoria de `PAG*JOSEDASILVA` para "Mercado" com "Aplicar sempre"
- **THEN** a transação fica em "Mercado" com `category_source = 'user'`, existe a regra "igual a PAG*JOSEDASILVA → Mercado", e as outras transações com essa descrição, sem categoria do usuário, passam para "Mercado"

#### Scenario: Correção sobrevive à sincronização
- **WHEN** a sincronização roda depois da sua correção
- **THEN** a transação continua na categoria que você escolheu

#### Scenario: Categoria arquivada
- **WHEN** a troca pede uma categoria arquivada
- **THEN** a resposta é 400 com `code: "VALIDATION_ERROR"`

#### Scenario: Segunda correção da mesma descrição
- **WHEN** você troca para "Transporte" a segunda transação `UBER *TRIP` do Open Finance, depois de já ter trocado a primeira para "Transporte", sem "Aplicar sempre"
- **THEN** a resposta traz `ruleSuggestion` com o padrão `UBER *TRIP`, a categoria "Transporte" e `correctionCount` 2

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

### Requirement: Categoria em massa
`PATCH /api/v1/transactions/category` com `transactionIds` (1 a 100) e `categoryId` MUST gravar a categoria com `category_source = 'user'` e marcar como revisadas todas as transações que existem, do Open Finance e manuais, numa transação só do banco de dados, MUST reavaliar os alertas de orçamento e MUST devolver `updatedCount` e `ruleSuggestion`. Uma categoria arquivada MUST ser recusada com 400 `VALIDATION_ERROR` sem mudar nada. A lista de Transações e a caixa "Para revisar" MUST ter o modo "Selecionar", com caixa de seleção de 44 px em cada linha e uma barra com o número de selecionadas, "Trocar categoria", "Marcar como revisadas" e "Cancelar". No computador, Shift+clique MUST selecionar o intervalo.

#### Scenario: Trocar várias
- **WHEN** o usuário seleciona 5 transações e escolhe "Restaurantes"
- **THEN** as 5 ficam em "Restaurantes" com `category_source = 'user'`, revisadas, e a lista sai do modo de seleção

#### Scenario: Orçamento atualizado
- **WHEN** a troca em massa leva "Restaurantes" a 85% do limite
- **THEN** o alerta de orçamento já existe na próxima consulta

#### Scenario: Categoria arquivada em massa
- **WHEN** a troca em massa pede uma categoria arquivada
- **THEN** a resposta é 400 e nenhuma das transações muda

#### Scenario: Celular
- **WHEN** o modo "Selecionar" está ativo com 390 px de largura
- **THEN** a barra de ações fica fixa embaixo, acima da área segura, sem cobrir a última linha da lista

### Requirement: Filtro por etiqueta e busca na nota
`GET /api/v1/transactions` e `GET /api/v1/transactions/summary` MUST aceitar `tagId` e trazer só as transações com aquela etiqueta. A busca MUST encontrar o termo também na nota, sem diferenciar maiúsculas e acentos. A tela MUST ter o filtro "Etiqueta" junto dos outros filtros, com o chip "Etiqueta: <nome>".

#### Scenario: Filtrar pela viagem
- **WHEN** o usuário filtra pela etiqueta "Viagem Chile"
- **THEN** a lista e o resumo mostram só as transações com essa etiqueta

#### Scenario: Buscar na nota
- **WHEN** a busca é `reembolso` e uma compra tem a nota "Pedir reembolso à empresa"
- **THEN** a compra aparece no resultado
