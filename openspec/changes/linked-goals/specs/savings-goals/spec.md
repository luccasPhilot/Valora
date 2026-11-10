## MODIFIED Requirements

### Requirement: Cadastro de metas
O sistema MUST permitir criar, editar e excluir metas com nome (1 a 80 caracteres), ícone, valor desejado em centavos (inteiro maior que zero), prazo opcional, valor acumulado inicial opcional e, opcionalmente, vínculos (`links`) com contas e investimentos. Excluir uma meta MUST apagar os aportes e os vínculos dela. A resposta MUST NOT expor `raw` nem ids do Pluggy dos itens vinculados. Criar uma meta com `links` e com valor inicial maior que zero MUST ser recusado.

#### Scenario: Meta com valor inicial
- **WHEN** o usuário cria "Viagem" com valor desejado de R$ 10.000,00 e R$ 1.500,00 já guardados
- **THEN** a meta é criada com `saved_cents` `150000` e um aporte do tipo `initial` de `150000`

#### Scenario: Valor desejado inválido
- **WHEN** o valor desejado é zero
- **THEN** a API responde 400 `VALIDATION_ERROR` com `targetCents` em `details`

#### Scenario: Excluir meta
- **WHEN** o usuário exclui uma meta com aportes e vínculos
- **THEN** a meta, os aportes e os vínculos dela deixam de existir

#### Scenario: Valor inicial junto com vínculo
- **WHEN** o usuário cria uma meta com `links` e `initialCents` `100000`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `initialCents` em `details`

### Requirement: Aportes e retiradas
`POST /api/v1/goals/:id/contributions` MUST registrar um aporte (valor positivo) ou uma retirada (`type` `withdrawal`) com data até hoje e atualizar o valor acumulado da meta na mesma transação do banco. O valor acumulado MUST ser sempre a soma dos aportes e retiradas. Uma retirada que deixaria o valor acumulado abaixo de zero MUST ser recusada. `DELETE` de um aporte MUST desfazer o efeito dele no valor acumulado. Numa meta vinculada, `POST` e `DELETE` de aportes MUST ser recusados com 409 `GOAL_IS_LINKED`, sem alterar nada.

#### Scenario: Registrar aporte
- **WHEN** a meta tem `150000` e o usuário registra um aporte de R$ 500,00
- **THEN** o valor acumulado passa a ser `200000`

#### Scenario: Retirada maior que o acumulado
- **WHEN** a meta tem `20000` e o usuário tenta retirar R$ 300,00
- **THEN** a API responde 400 `VALIDATION_ERROR` e o valor acumulado continua `20000`

#### Scenario: Remover aporte
- **WHEN** o usuário remove o aporte de `50000`
- **THEN** o valor acumulado diminui em `50000`

#### Scenario: Data no futuro
- **WHEN** a data do aporte é amanhã
- **THEN** a API responde 400 `VALIDATION_ERROR` com `date` em `details`

#### Scenario: Aporte em meta vinculada
- **WHEN** o usuário registra um aporte numa meta com vínculos
- **THEN** a API responde 409 `GOAL_IS_LINKED` e nenhum aporte é criado

#### Scenario: Remover aporte de meta vinculada
- **WHEN** o usuário remove um aporte antigo de uma meta que hoje tem vínculos
- **THEN** a API responde 409 `GOAL_IS_LINKED` e o aporte continua

## ADDED Requirements

### Requirement: Meta vinculada
`POST /api/v1/goals` e `PUT /api/v1/goals/:id` MUST aceitar `links`: até 10 itens `{ type, id }`, com `type` `account` (conta `checking` ou `savings`) ou `investment`, de bancos ativos. Cartão de crédito, a conta "Dinheiro", itens de banco arquivado, ids inexistentes e itens repetidos MUST ser recusados com 400 `VALIDATION_ERROR` e `links` em `details`. No `PUT`, `links` ausente MUST manter os vínculos e `links: []` MUST desvincular a meta. `GET /api/v1/goals` MUST trazer `isLinked`, `links` (cada um com `type`, `id`, `name`, `institutionName`, `balanceCents` e `isArchived`) e `manualSavedCents`. O valor acumulado `savedCents` de uma meta vinculada MUST ser `max(0, soma dos saldos atuais dos itens de bancos ativos)`; um item de banco arquivado MUST continuar listado e MUST contar zero. `goals.saved_cents` MUST NOT ser alterado enquanto a meta é vinculada, e os aportes já registrados MUST ser mantidos e voltar a valer na desvinculação. Progresso, valor restante e situação MUST usar o valor acumulado calculado.

#### Scenario: Soma de dois itens
- **WHEN** a meta está vinculada a um CDB de R$ 10.000,00 e a uma conta poupança de R$ 2.500,00
- **THEN** `savedCents` é `1250000` e `isLinked` é verdadeiro

#### Scenario: Atualiza sozinha
- **WHEN** a sincronização muda o saldo do CDB para R$ 10.300,00
- **THEN** o `savedCents` da meta passa a ser `1280000` sem nenhuma ação do usuário

#### Scenario: Cartão de crédito
- **WHEN** o usuário tenta vincular uma conta do tipo cartão de crédito
- **THEN** a API responde 400 `VALIDATION_ERROR` com `links` em `details`

#### Scenario: Mais de 10 itens
- **WHEN** `links` tem 11 itens
- **THEN** a API responde 400 `VALIDATION_ERROR` com `links` em `details`

#### Scenario: Banco arquivado depois do vínculo
- **WHEN** o banco de um item vinculado é arquivado
- **THEN** o item continua em `links` com `isArchived` verdadeiro e não soma no `savedCents`

#### Scenario: Saldo negativo
- **WHEN** a única conta vinculada está no cheque especial com `−R$ 200,00`
- **THEN** `savedCents` é `0`

#### Scenario: Desvincular
- **WHEN** o usuário edita a meta com `links: []`
- **THEN** a meta volta a ser manual e `savedCents` volta a ser o `saved_cents` guardado

#### Scenario: Aportes antigos preservados
- **WHEN** uma meta com R$ 1.500,00 em aportes é vinculada a um CDB de R$ 10.000,00
- **THEN** `savedCents` é `1000000`, `manualSavedCents` é `150000` e os aportes continuam no histórico

#### Scenario: Editar sem mexer nos vínculos
- **WHEN** o `PUT` muda só o nome e não envia `links`
- **THEN** os vínculos continuam os mesmos

### Requirement: Ritmo da meta vinculada
O ritmo mensal de uma meta vinculada MUST ser `max(0, floor(Σ variações × 30 ÷ janela))`, onde a variação de cada item de banco ativo é o saldo atual menos a foto mais antiga dele nos últimos 90 dias, e a janela é o número de dias entre a foto mais antiga usada e hoje, limitado de 30 a 90. Sem foto anterior a hoje na janela, ou com variação não positiva, o ritmo MUST ser zero e a situação `no_pace`. O prazo estimado, o teto de 600 meses e a situação frente ao prazo MUST seguir as mesmas regras da meta manual.

#### Scenario: Ritmo pela variação
- **WHEN** o saldo vinculado era R$ 9.000,00 há 90 dias e hoje é R$ 9.900,00
- **THEN** o ritmo é `30000` por mês

#### Scenario: Histórico curto
- **WHEN** a primeira foto é de 6 dias atrás e a variação é R$ 300,00
- **THEN** o ritmo usa a janela mínima de 30 dias e vale `30000` por mês

#### Scenario: Saldo caiu
- **WHEN** o saldo vinculado hoje é menor que o da primeira foto da janela
- **THEN** o ritmo é zero e a situação é `no_pace`

#### Scenario: Só a foto de hoje
- **WHEN** a única foto dos itens é a de hoje
- **THEN** o ritmo é zero e a situação é `no_pace`

#### Scenario: Item novo no meio da janela
- **WHEN** um investimento vinculado só tem fotos dos últimos 5 dias
- **THEN** a variação dele conta desde a primeira foto dele, sem tratar o saldo inteiro como ritmo

#### Scenario: Meta atingida
- **WHEN** a soma dos saldos vinculados é maior ou igual ao valor desejado
- **THEN** a situação é `completed`, qualquer que seja o ritmo

### Requirement: Vínculo na tela de Metas
O formulário de meta MUST oferecer "Eu informo" e "Vinculada". Em "Vinculada", MUST listar as contas (corrente e poupança) e os investimentos de bancos ativos com nome, instituição e saldo, permitir escolher até 10, mostrar a soma atual, esconder o valor inicial e avisar quando um item já está em outra meta. Ao vincular uma meta com aportes, MUST avisar que eles deixam de contar; ao desvincular, MUST avisar que o valor volta a ser o dos aportes. O cartão MUST mostrar o selo "Vinculada" com ícone e a quantidade de itens. O painel de uma meta vinculada MUST listar os itens com o saldo de cada um, marcar o item de banco arquivado como "Banco removido do Valora: não conta", esconder "Registrar aporte" e "Registrar retirada" e explicar que o valor acompanha o saldo e muda na sincronização diária e que o ritmo mistura aporte e rendimento. MUST manter os estados, "Ocultar valores" e o funcionamento de 320 px a 1440 px nos dois temas.

#### Scenario: Escolher itens
- **WHEN** o usuário escolhe "Vinculada" e marca um CDB e uma poupança
- **THEN** o formulário mostra a soma atual dos dois e não mostra o valor inicial

#### Scenario: Item em outra meta
- **WHEN** o investimento escolhido já está vinculado a outra meta
- **THEN** o formulário avisa que ele contará inteiro nas duas

#### Scenario: Vincular meta com aportes
- **WHEN** o usuário vincula uma meta que tem R$ 1.500,00 em aportes
- **THEN** a tela avisa que esses aportes deixam de contar enquanto a meta estiver vinculada

#### Scenario: Painel sem aportes manuais
- **WHEN** o usuário abre o painel de uma meta vinculada
- **THEN** não há "Registrar aporte" nem "Registrar retirada" e os itens vinculados aparecem com o saldo

#### Scenario: Item de banco arquivado
- **WHEN** um item vinculado é de um banco arquivado
- **THEN** o painel o marca com "Banco removido do Valora: não conta", em ícone e texto

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado
- **THEN** os saldos dos itens e a soma aparecem mascarados

#### Scenario: Celular estreito
- **WHEN** a largura é 320 px e o nome do investimento é longo
- **THEN** o nome é truncado, o saldo continua visível e não há rolagem horizontal
