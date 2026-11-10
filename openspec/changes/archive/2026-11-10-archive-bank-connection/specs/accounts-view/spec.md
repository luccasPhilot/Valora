## MODIFIED Requirements

### Requirement: Consulta de contas
`GET /api/v1/accounts` MUST devolver todas as contas dos bancos ativos (não arquivados), inclusive "Dinheiro". Cada conta MUST trazer:
- `id`, `name`, `type`, `lastDigits`, `balanceCents`, `isHidden`;
- `creditLimitCents` e `availableLimitCents` nos cartões;
- a conexão (`institutionName`, `status`, `statusDetail`, `lastSyncedAt`), ou nulo em "Dinheiro".

O JSON bruto do Pluggy MUST NOT ser exposto.

#### Scenario: Conta "Dinheiro"
- **WHEN** a consulta é feita
- **THEN** "Dinheiro" vem com `type: "cash"`, `balanceCents: null` e conexão nula

#### Scenario: Banco arquivado
- **WHEN** o banco "Conta Corrente" está arquivado
- **THEN** as contas dele não vêm na resposta

### Requirement: Saldo total
A resposta MUST trazer os totais calculados pela API, sempre sobre as contas de bancos ativos:
- `totalBalanceCents`: soma dos saldos das contas `checking` e `savings` com `isHidden` falso;
- `openCreditCardBillsCents`: soma das faturas atuais dos cartões não ocultos;
- `availableCreditCents`: soma dos limites disponíveis dos cartões não ocultos.

Cartões e "Dinheiro" MUST NOT entrar no saldo total.

#### Scenario: Contas e cartão
- **WHEN** a conta corrente tem R$ 3.000,00, a poupança R$ 1.850,32 e o cartão uma fatura de R$ 900,00
- **THEN** `totalBalanceCents` é `485032` e `openCreditCardBillsCents` é `90000`

#### Scenario: Conta oculta
- **WHEN** a poupança está oculta dos totais
- **THEN** `totalBalanceCents` não inclui a poupança

#### Scenario: Cheque especial
- **WHEN** a conta corrente está com saldo de −R$ 200,00 e a poupança com R$ 1.000,00
- **THEN** `totalBalanceCents` é `80000`

#### Scenario: Banco arquivado
- **WHEN** um banco com conta corrente de R$ 3.000,00 está arquivado e outro banco tem R$ 1.000,00
- **THEN** `totalBalanceCents` é `100000`

### Requirement: Conexão com problema
Uma instituição ativa com conexão em `error`, `consent_expired` ou `item_not_found`, ou com `isConfigured` falso, MUST mostrar o status e uma explicação do que fazer: reconectar pelo Meu Pluggy nos dois primeiros casos, e "Remover do Valora" nos dois últimos (ver `bank-archiving`). Enquanto houver uma conexão assim, todas as telas MUST mostrar uma faixa no topo com o nome do banco, a data da última sincronização bem-sucedida e um atalho para a tela de Contas (ou o botão "Remover do Valora", nos dois últimos casos).

#### Scenario: Consentimento expirado
- **WHEN** a conexão do Itaú está com `consent_expired` e a última sincronização boa foi em 1º de novembro
- **THEN** todas as telas mostram a faixa "Itaú não sincroniza desde 01/11", e tocar nela abre Contas

#### Scenario: Banco removido do Meu Pluggy
- **WHEN** a conexão está com `item_not_found`
- **THEN** o status mostra "Removido do Meu Pluggy" e a faixa oferece "Remover do Valora"

#### Scenario: Tudo certo
- **WHEN** todas as conexões ativas estão `ok` e dentro do `PLUGGY_ITEM_IDS`
- **THEN** nenhuma faixa aparece

#### Scenario: Banco arquivado com problema
- **WHEN** o banco com erro foi arquivado
- **THEN** nenhuma faixa aparece por causa dele
