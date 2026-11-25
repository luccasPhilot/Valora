## ADDED Requirements

### Requirement: Alerta de consentimento a vencer
Para cada conexão ativa cujo consentimento vence entre agora e 30 dias, o sistema MUST manter um alerta `consent_expiring` com a mensagem "O consentimento do {banco} vence em {dd/mm}. Renove a conexão no Meu Pluggy." e destino na tela de Contas: um de 30 a 8 dias antes e outro, separado, a partir de 7 dias antes. Quando o consentimento for renovado (data mais de 30 dias à frente), vencer, ou o banco for arquivado, o alerta MUST ser resolvido. A mensagem MUST NOT conter valores.

#### Scenario: 30 dias antes
- **WHEN** a sincronização de 28/11 lê que o consentimento do Itaú vence em 28/12
- **THEN** nasce o alerta "O consentimento do Itaú vence em 28/12. Renove a conexão no Meu Pluggy."

#### Scenario: Segundo aviso
- **WHEN** o usuário dispensou o primeiro aviso e a sincronização de 21/12 roda
- **THEN** o aviso de 30 dias é resolvido e nasce o de 7 dias

#### Scenario: Renovado
- **WHEN** o usuário renova o consentimento e a sincronização lê o vencimento novo, um ano à frente
- **THEN** o alerta é resolvido

#### Scenario: Venceu
- **WHEN** o consentimento vence
- **THEN** o alerta de vencimento é resolvido e o de conexão (`connection_error`) assume
