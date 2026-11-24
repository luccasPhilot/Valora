# manual-investments Specification

## Purpose
Posições de investimento de instituições fora do Open Finance (INCO, Binance, corretoras sem conector), com o valor informado à mão em reais: cadastro, atualização, encerramento e exclusão, e a foto diária gravada pela sincronização sem que ela altere, zere ou apague a posição.
## Requirements
### Requirement: Cadastro de posição manual
`POST /api/v1/investments` MUST criar uma posição de investimento manual (`source = 'manual'`) sem conexão e sem id do Pluggy, a partir de `name` (1 a 60 caracteres), `institutionName` (1 a 60 caracteres), `type` e `balanceCents` (inteiro maior que zero). `type` MUST ser um de `FIXED_INCOME`, `MUTUAL_FUND`, `EQUITY`, `ETF`, `CRYPTO` ou `OTHER`; qualquer outro valor, nome ou instituição vazios e `balanceCents` zero, negativo ou com casas decimais MUST ser recusados com 400 `VALIDATION_ERROR` e o nome do campo em `details`. A posição MUST guardar `balance_updated_on` com o dia de hoje (fuso de São Paulo) e MUST gravar a foto de hoje em `investment_snapshots` na mesma transação do banco. A resposta MUST ser 201 e MUST NOT expor `raw` nem id do Pluggy.

#### Scenario: Fundo da INCO
- **WHEN** o usuário cria `{ "name": "Fundo INCO", "institutionName": "INCO", "type": "MUTUAL_FUND", "balanceCents": 2500000 }`
- **THEN** a API responde 201 e a posição tem `source` `manual` e `balanceUpdatedOn` de hoje

#### Scenario: Foto do dia na criação
- **WHEN** a posição é criada
- **THEN** existe uma foto de hoje com `balanceCents` `2500000` para ela

#### Scenario: Valor zero ou negativo
- **WHEN** o usuário envia `balanceCents` `0` ou `-100`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `balanceCents` em `details` e nada é gravado

#### Scenario: Tipo desconhecido
- **WHEN** o usuário envia `type` `"STOCKS"`
- **THEN** a API responde 400 `VALIDATION_ERROR` com `type` em `details`

#### Scenario: Instituição vazia
- **WHEN** o usuário envia `institutionName` vazio
- **THEN** a API responde 400 `VALIDATION_ERROR` com `institutionName` em `details`

### Requirement: Atualização do valor e dos dados
`PATCH /api/v1/investments/:id` MUST aceitar, de forma parcial, `name`, `institutionName`, `type` e `balanceCents` (inteiro maior ou igual a zero) numa posição manual, com as mesmas validações do cadastro. Quando `balanceCents` vier no pedido, o sistema MUST atualizar `balance_updated_on` para hoje e MUST gravar (ou substituir) a foto de hoje com o novo valor, na mesma transação do banco. Mudar só nome, instituição ou tipo MUST NOT alterar `balance_updated_on` nem as fotos. Um `balanceCents` zero MUST encerrar a posição (ela passa a contar como "zerada") e um valor maior que zero MUST reabri-la. Como a posição encerrada sai da lista, a tela MUST pedir confirmação antes de encerrar. Um id inexistente MUST responder 404 `NOT_FOUND` e uma posição do Open Finance MUST responder 409 `OPEN_FINANCE_READ_ONLY`.

#### Scenario: Atualizar o valor
- **WHEN** o usuário envia `{ "balanceCents": 2600000 }` para uma posição de R$ 25.000,00
- **THEN** o saldo passa a `2600000`, `balanceUpdatedOn` é hoje e a foto de hoje vale `2600000`

#### Scenario: Atualizar duas vezes no mesmo dia
- **WHEN** o valor é atualizado duas vezes hoje
- **THEN** existe uma única foto de hoje, com o último valor

#### Scenario: Renomear não mexe no valor
- **WHEN** o usuário envia só `{ "name": "INCO Renda" }`
- **THEN** o nome muda e `balanceUpdatedOn` e as fotos continuam como estavam

#### Scenario: Encerrar a posição
- **WHEN** o usuário envia `{ "balanceCents": 0 }`
- **THEN** a posição fica com saldo `0`, a foto de hoje vale `0` e a posição passa a contar em `closedCount`

#### Scenario: Confirmação ao encerrar na tela
- **WHEN** o usuário toca em "Encerrar posição" no painel
- **THEN** a tela pede confirmação, dizendo que a posição sai da lista e o histórico continua, e só então envia `{ "balanceCents": 0 }`

#### Scenario: Posição do Open Finance
- **WHEN** o usuário envia qualquer campo para um investimento que veio do Pluggy
- **THEN** a API responde 409 `OPEN_FINANCE_READ_ONLY` e nada muda

#### Scenario: Id inexistente
- **WHEN** o id não existe
- **THEN** a API responde 404 `NOT_FOUND` com mensagem que cita o id

### Requirement: Exclusão de posição manual
`DELETE /api/v1/investments/:id` MUST excluir uma posição manual, apagando as fotos dela e os vínculos que metas tenham com ela (as metas e os aportes delas continuam), e MUST responder 204. Uma posição do Open Finance MUST responder 409 `OPEN_FINANCE_READ_ONLY` e um id inexistente MUST responder 404 `NOT_FOUND`. A tela MUST pedir confirmação e MUST avisar que o histórico dessa posição some da evolução do patrimônio.

#### Scenario: Excluir
- **WHEN** o usuário exclui uma posição manual vinculada a uma meta
- **THEN** a API responde 204, a posição e as fotos somem, o vínculo é removido e a meta continua existindo

#### Scenario: Excluir do Open Finance
- **WHEN** o id é de um investimento do Pluggy
- **THEN** a API responde 409 `OPEN_FINANCE_READ_ONLY` e o investimento continua

#### Scenario: Confirmação na tela
- **WHEN** o usuário aciona "Excluir" numa posição manual
- **THEN** a tela pede confirmação e diz que o histórico dela sai do patrimônio

### Requirement: Foto diária das posições manuais
Toda sincronização (agendada ou manual) MUST gravar, depois de sincronizar os bancos e **mesmo que algum banco tenha falhado**, a foto do dia de cada posição manual com o saldo atual dela, substituindo a foto de hoje se já existir. Posição manual encerrada (saldo zero) MUST também receber a foto `0`. Se esse passo falhar, a sincronização MUST seguir para os alertas, MUST registrar nos logs só o tipo do erro e MUST NOT mudar o resultado dos bancos.

#### Scenario: Valor repetido
- **WHEN** a sincronização roda 10 dias depois da última atualização de uma posição de R$ 25.000,00
- **THEN** existe uma foto de hoje de `2500000` para ela

#### Scenario: Banco com falha
- **WHEN** a sincronização termina com um banco em falha
- **THEN** as fotos das posições manuais do dia são gravadas assim mesmo

#### Scenario: Sem posições manuais
- **WHEN** não há nenhuma posição manual
- **THEN** o passo não grava nada e a sincronização termina normalmente

#### Scenario: Falha ao gravar as fotos
- **WHEN** a gravação das fotos manuais falha
- **THEN** os alertas ainda são avaliados, o resultado dos bancos não muda e o log traz só o tipo do erro

### Requirement: A sincronização não toca nas posições manuais
A sincronização MUST NOT alterar, zerar ou apagar uma posição manual. O passo "posição que sumiu = posição zerada" MUST valer só para investimentos de uma conexão (`source = 'open_finance'`).

#### Scenario: Sincronizar com a lista do banco vazia
- **WHEN** um banco devolve nenhum investimento e existe uma posição manual de R$ 25.000,00
- **THEN** a posição manual continua com saldo `2500000`

#### Scenario: Banco arquivado
- **WHEN** qualquer banco é arquivado
- **THEN** as posições manuais continuam na lista e no patrimônio

### Requirement: Origem e atualização nas respostas
Cada item de `GET /api/v1/investments` MUST trazer `source` (`open_finance` ou `manual`) e `balanceUpdatedOn` (`AAAA-MM-DD` em posição manual, nulo em posição do Open Finance). Em posição manual, `institutionName` MUST ser a instituição informada pelo usuário e `subtype` MUST ser nulo.

#### Scenario: Item manual
- **WHEN** a lista traz o Fundo INCO criado em 10/11
- **THEN** o item tem `source` `manual`, `balanceUpdatedOn` `2026-11-10`, `institutionName` `INCO` e `subtype` nulo

#### Scenario: Item do Open Finance
- **WHEN** a lista traz um CDB do Pluggy
- **THEN** o item tem `source` `open_finance` e `balanceUpdatedOn` nulo

