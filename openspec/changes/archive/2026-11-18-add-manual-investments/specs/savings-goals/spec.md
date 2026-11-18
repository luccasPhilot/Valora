## MODIFIED Requirements

### Requirement: Meta vinculada
`POST /api/v1/goals` e `PUT /api/v1/goals/:id` MUST aceitar `links`: itens `{ type, id }`, sem limite de quantidade, com `type` `account` (conta `checking` ou `savings`) ou `investment` (de banco ativo ou **posição manual**), de bancos ativos. Cartão de crédito, a conta "Dinheiro", itens de banco arquivado, ids inexistentes e itens repetidos MUST ser recusados com 400 `VALIDATION_ERROR` e `links` em `details`. No `PUT`, `links` ausente MUST manter os vínculos e `links: []` MUST desvincular a meta. `GET /api/v1/goals` MUST trazer `isLinked`, `links` (cada um com `type`, `id`, `name`, `institutionName`, `balanceCents` e `isArchived`) e `manualSavedCents`. O valor acumulado `savedCents` de uma meta vinculada MUST ser `max(0, soma dos saldos atuais dos itens de bancos ativos e das posições manuais)`; um item de banco arquivado MUST continuar listado e MUST contar zero, e uma posição manual MUST NOT ser considerada arquivada. `goals.saved_cents` MUST NOT ser alterado enquanto a meta é vinculada, e os aportes já registrados MUST ser mantidos e voltar a valer na desvinculação. Progresso, valor restante e situação MUST usar o valor acumulado calculado.

#### Scenario: Soma de dois itens
- **WHEN** a meta está vinculada a um CDB de R$ 10.000,00 e a uma conta poupança de R$ 2.500,00
- **THEN** `savedCents` é `1250000` e `isLinked` é verdadeiro

#### Scenario: Posição manual vinculada
- **WHEN** a meta está vinculada a uma posição manual "Fundo INCO" de R$ 25.000,00 da instituição "INCO"
- **THEN** `savedCents` é `2500000`, o vínculo traz `institutionName` `INCO` e `isArchived` falso

#### Scenario: Atualizar o valor manual muda a meta
- **WHEN** o usuário atualiza a posição manual vinculada para R$ 26.000,00
- **THEN** o `savedCents` da meta passa a ser `2600000` sem nenhuma outra ação

#### Scenario: Atualiza sozinha
- **WHEN** a sincronização muda o saldo do CDB para R$ 10.300,00
- **THEN** o `savedCents` da meta passa a ser `1280000` sem nenhuma ação do usuário

#### Scenario: Cartão de crédito
- **WHEN** o usuário tenta vincular uma conta do tipo cartão de crédito
- **THEN** a API responde 400 `VALIDATION_ERROR` com `links` em `details`

#### Scenario: Muitos itens
- **WHEN** `links` tem 11 itens válidos
- **THEN** a API cria a meta e `savedCents` é a soma dos saldos dos 11 itens

#### Scenario: Banco arquivado depois do vínculo
- **WHEN** o banco de um item vinculado é arquivado
- **THEN** o item continua em `links` com `isArchived` verdadeiro e não soma no `savedCents`

#### Scenario: Banco arquivado não afeta posição manual
- **WHEN** um banco é arquivado e a meta também está vinculada a uma posição manual
- **THEN** a posição manual continua somando no `savedCents`

#### Scenario: Excluir a posição manual vinculada
- **WHEN** o usuário exclui a posição manual vinculada
- **THEN** o vínculo some da meta, a meta continua existindo e os aportes dela continuam no histórico

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
