## ADDED Requirements

### Requirement: Vencimento do consentimento gravado
A cada leitura do item no Pluggy, a sincronização MUST gravar em `connections.consent_expires_at` o vencimento do consentimento informado pelo Pluggy, ou nulo quando ele não informar, mesmo que a leitura dos dados do banco falhe depois.

#### Scenario: Vencimento informado
- **WHEN** o Pluggy devolve o item com `consentExpiresAt` em 28/12/2026
- **THEN** a conexão fica com `consent_expires_at` em 28/12/2026

#### Scenario: Falha depois da leitura do item
- **WHEN** o item é lido e a busca das transações falha
- **THEN** o vencimento do consentimento fica gravado mesmo assim
