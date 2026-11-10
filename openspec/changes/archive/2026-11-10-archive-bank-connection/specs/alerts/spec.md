## MODIFIED Requirements

### Requirement: Alerta de conexão
O sistema MUST criar um alerta `connection_error` para cada conexão **ativa** com status `error`, `consent_expired` ou `item_not_found`, com a mensagem derivada de `status_detail`, no máximo um ativo por conexão. Quando a conexão voltar a `ok`, ou for arquivada, o alerta MUST ser resolvido. A mensagem MUST NOT conter valores nem descrições de transações.

#### Scenario: Consentimento expirou
- **WHEN** uma conexão passa para `consent_expired`
- **THEN** nasce um alerta `connection_error` ligado a essa conexão

#### Scenario: Banco voltou
- **WHEN** a conexão volta a `ok` na sincronização seguinte
- **THEN** o alerta é resolvido

#### Scenario: Erro que continua
- **WHEN** a conexão continua com erro em várias sincronizações
- **THEN** existe um único alerta ativo

#### Scenario: Banco removido do Meu Pluggy
- **WHEN** uma conexão passa para `item_not_found`
- **THEN** nasce um alerta `connection_error` com a mensagem "Este banco foi removido do Meu Pluggy. Remova-o do Valora."

#### Scenario: Banco arquivado
- **WHEN** o usuário arquiva um banco que tem um alerta de conexão ativo
- **THEN** o alerta é resolvido e não volta enquanto o banco estiver arquivado
