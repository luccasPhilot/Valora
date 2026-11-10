## ADDED Requirements

### Requirement: Bancos arquivados são pulados
A sincronização MUST NOT ler o Pluggy nem alterar o status de uma conexão arquivada, mesmo que o id dela continue no `PLUGGY_ITEM_IDS`. Um banco pulado MUST NOT fazer a execução virar `partial` nem `failed`.

#### Scenario: Arquivado com o id no .env
- **WHEN** a conexão está arquivada e o id continua no `PLUGGY_ITEM_IDS`
- **THEN** nenhuma chamada é feita ao Pluggy para esse banco, o status dele não muda e a execução termina `success` se os outros bancos deram certo

#### Scenario: Conexão arquivada não é recriada
- **WHEN** a sincronização roda com o id de um banco arquivado no `PLUGGY_ITEM_IDS`
- **THEN** não nasce uma conexão nova para esse id

### Requirement: Banco que não existe mais no Pluggy
Quando o Pluggy responder que o item não existe, a sincronização MUST gravar na conexão o status `item_not_found` com a mensagem "Este banco foi removido do Meu Pluggy. Remova-o do Valora.", sem tratar o caso como uma falha genérica. Outras falhas MUST continuar como `error`. O `PluggyClient` MUST continuar sendo o único ponto de contato com o Pluggy.

#### Scenario: Item removido do Meu Pluggy
- **WHEN** a consulta do item responde "não encontrado"
- **THEN** a conexão fica com `status: "item_not_found"` e a mensagem acima, e os outros bancos seguem sendo sincronizados

#### Scenario: Falha qualquer
- **WHEN** a consulta do item falha por erro de rede ou resposta inválida
- **THEN** a conexão fica com `status: "error"` e a mensagem genérica de sempre

#### Scenario: Banco volta a existir
- **WHEN** um banco com `item_not_found` volta a responder normalmente
- **THEN** a conexão volta a `ok` na sincronização seguinte

## MODIFIED Requirements

### Requirement: Lista de conexões
`GET /api/v1/connections` MUST devolver cada conexão **ativa** (não arquivada) com o nome da instituição, o status, a mensagem de status, a data da última sincronização e `isConfigured`. Conexões arquivadas MUST ser listadas só com `?archived=true` (ver `bank-archiving`).

#### Scenario: Conexões listadas
- **WHEN** existem três conexões ativas e uma está com erro
- **THEN** a resposta lista as três, e a com erro traz `status: "error"` e a mensagem

#### Scenario: Conexão arquivada
- **WHEN** existe uma quarta conexão, arquivada
- **THEN** ela não aparece em `GET /connections`
