## ADDED Requirements

### Requirement: Cadastro de previsões
O sistema MUST permitir criar, editar e excluir previsões de receita e despesa com descrição, valor, categoria, dia do mês, repetição (`none`, `monthly` ou `yearly`), mês de início e mês de fim opcional. O valor MUST ser guardado em centavos, negativo para despesa. A categoria MUST estar ativa e ser do tipo `income` para receita e `expense` para despesa; categorias `transfer` MUST ser recusadas com `VALIDATION_ERROR`.

#### Scenario: Despesa mensal
- **WHEN** o usuário cria "Aluguel", despesa de R$ 1.800,00, dia 10, mensal, a partir de 2026-12
- **THEN** a previsão é gravada com `amount_cents` `-180000` e `recurrence` `monthly`

#### Scenario: Categoria de transferência
- **WHEN** o usuário tenta criar uma previsão com a categoria "Pagamento de fatura"
- **THEN** a API responde 400 `VALIDATION_ERROR` com `categoryId` em `details`

#### Scenario: Categoria de outro tipo
- **WHEN** o usuário cria uma receita com uma categoria de despesa
- **THEN** a API responde 400 `VALIDATION_ERROR`

### Requirement: Ocorrências do mês
`GET /api/v1/planned-entries?month=AAAA-MM` MUST devolver as ocorrências do mês, cada uma com a previsão, a data prevista, a situação (`pending`, `realized`, `skipped`) e o vínculo, e os totais previstos de receitas e despesas. Sem `month`, MUST usar o mês atual em São Paulo. Uma previsão `none` MUST aparecer só no mês de início. Uma `monthly` MUST aparecer em todo mês do início ao fim, inclusive. Uma `yearly` MUST aparecer só no mês de início de cada ano. Previsões pausadas (`is_active = false`) MUST NOT gerar ocorrências.

#### Scenario: Mensal dentro do período
- **WHEN** a previsão mensal vai de 2026-12 a 2027-02 e o mês pedido é 2027-01
- **THEN** a resposta traz uma ocorrência dela

#### Scenario: Mensal depois do fim
- **WHEN** o mês pedido é 2027-03 e a previsão acabou em 2027-02
- **THEN** a resposta não traz ocorrência dela

#### Scenario: Anual
- **WHEN** a previsão anual começou em 2026-03 e o mês pedido é 2027-03
- **THEN** a resposta traz uma ocorrência, e nenhuma em 2027-04

#### Scenario: Dia 31 em fevereiro
- **WHEN** a previsão é do dia 31 e o mês pedido é fevereiro de 2027
- **THEN** a data prevista é 2027-02-28

#### Scenario: Previsão pausada
- **WHEN** a previsão está pausada
- **THEN** ela não aparece nas ocorrências de nenhum mês

### Requirement: Realizar uma ocorrência
`PUT /api/v1/planned-entries/:id/occurrences/:month` com `action` `realize` MUST marcar a ocorrência como realizada, vinculando a transação informada quando houver `transactionId`. O vínculo MUST exigir uma transação do mesmo mês, com o mesmo sinal da previsão, e ainda não vinculada a outra ocorrência. O sistema MUST NOT vincular transação sozinho.

#### Scenario: Vincular a uma transação
- **WHEN** o usuário vincula a ocorrência de dezembro à transação de − R$ 1.800,00 do dia 11/12
- **THEN** a ocorrência fica `realized` com o `transactionId` informado

#### Scenario: Realizar sem transação
- **WHEN** o usuário marca como realizada sem informar `transactionId`
- **THEN** a ocorrência fica `realized` sem vínculo

#### Scenario: Transação já usada
- **WHEN** a transação já está vinculada a outra ocorrência
- **THEN** a API responde 409 `TRANSACTION_ALREADY_LINKED` e nada muda

#### Scenario: Sinal diferente
- **WHEN** o usuário tenta vincular uma entrada a uma despesa prevista
- **THEN** a API responde 422 `TRANSACTION_NOT_COMPATIBLE`

#### Scenario: Transação excluída depois
- **WHEN** a transação manual vinculada é excluída
- **THEN** a ocorrência continua `realized`, sem vínculo

### Requirement: Pular e desfazer
`action` `skip` MUST marcar a ocorrência do mês como `skipped`. `DELETE` na mesma rota MUST desfazer a decisão, voltando a ocorrência para `pending`. Pular um mês MUST NOT afetar os outros meses da previsão.

#### Scenario: Pular um mês
- **WHEN** o usuário pula a ocorrência de janeiro de uma previsão mensal
- **THEN** janeiro fica `skipped` e fevereiro continua `pending`

#### Scenario: Desfazer
- **WHEN** o usuário desfaz uma ocorrência realizada
- **THEN** ela volta a `pending` e o vínculo é removido

### Requirement: Sugestão de transações
A resposta de cada ocorrência `pending` MUST trazer até 5 transações candidatas, do mesmo mês, com o mesmo sinal, a até 7 dias da data prevista e com categoria igual à da previsão ou valor dentro de 20% do previsto, excluindo as já vinculadas. As candidatas MUST vir ordenadas pela proximidade do valor e depois da data.

#### Scenario: Candidata por valor
- **WHEN** a previsão é uma despesa de R$ 200,00 no dia 10 e há uma saída de R$ 187,00 no dia 12 em outra categoria
- **THEN** a saída aparece como candidata

#### Scenario: Valor muito diferente
- **WHEN** a única saída do mês é de R$ 20,00 em outra categoria
- **THEN** ela não é candidata

### Requirement: Tela de Planejamento
A área "Planejamento" (`/planejamento`) MUST aparecer no menu lateral e mostrar, para o mês escolhido, as ocorrências agrupadas em pendentes, realizadas e puladas, com os totais previstos. MUST permitir criar, editar, pausar e excluir previsões, vincular, realizar sem vincular, pular e desfazer. MUST ter os estados carregando, vazio e erro, funcionar de 320 px a 1440 px nos dois temas e respeitar "Ocultar valores". Receita MUST aparecer em `positive` com `+` e despesa na cor normal com `−`.

#### Scenario: Mês sem previsões
- **WHEN** o mês não tem nenhuma ocorrência
- **THEN** a tela mostra o estado vazio com a ação "Adicionar previsão"

#### Scenario: Aviso ao editar
- **WHEN** o usuário edita uma previsão recorrente
- **THEN** o formulário avisa que a mudança vale para todos os meses e que, para mudar só daqui para frente, deve encerrar a previsão e criar outra

#### Scenario: Valor oculto
- **WHEN** "Ocultar valores" está ligado
- **THEN** os valores das ocorrências e dos totais aparecem mascarados
