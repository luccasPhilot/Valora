## MODIFIED Requirements

### Requirement: Editar transação manual
`PATCH /api/v1/transactions/:id` numa transação manual MUST aceitar `type`, `amountCents`, `description`, `date`, `categoryId`, `accountId`, `note` e `tagIds`, com as mesmas validações do lançamento. Numa transação do Open Finance, MUST aceitar só `categoryId`, `applyAlways`, `note` e `tagIds`; qualquer outro campo MUST ser recusado com 409 e `code: "OPEN_FINANCE_READ_ONLY"`.

#### Scenario: Corrigir o valor
- **WHEN** você muda o valor de uma despesa manual de R$ 12,50 para R$ 15,00
- **THEN** a transação passa a ter `amount_cents = -1500`

#### Scenario: Valor de transação do banco
- **WHEN** o `PATCH` tenta mudar `amountCents` de uma transação do Open Finance
- **THEN** a resposta é 409 com `code: "OPEN_FINANCE_READ_ONLY"` e nada muda

#### Scenario: Nota e etiqueta numa transação do banco
- **WHEN** o `PATCH` numa transação do Open Finance traz `note` e `tagIds`
- **THEN** a nota e as etiquetas são gravadas e os dados do banco continuam iguais

### Requirement: Resolver possível duplicata
`POST /api/v1/transactions/:id/duplicate-resolution`, chamado na transação do Open Finance, MUST aceitar `action` igual a `merge` ou `keep_both`.
- **`merge`:** numa única transação de banco, a do Open Finance MUST receber a categoria da manual com `category_source = 'user'`, a nota da manual (se ainda não tiver uma) e a união das etiquetas das duas; a manual MUST ser apagada e a marcação limpa.
- **`keep_both`:** a marcação MUST ser limpa e as duas MUST continuar.
- Se a transação não tiver possível duplicata pendente, MUST responder 409 com `code: "NO_DUPLICATE_PENDING"`.

#### Scenario: Juntar
- **WHEN** você escolhe "Juntar" numa possível duplicata em que a manual está em "Mercado"
- **THEN** só a transação do banco continua, em "Mercado", com `category_source = 'user'`

#### Scenario: Juntar com nota e etiqueta
- **WHEN** a manual tem a nota "Presente da Ana" e a etiqueta "Aniversário", e você escolhe "Juntar"
- **THEN** a transação do banco fica com a nota "Presente da Ana" e a etiqueta "Aniversário"

#### Scenario: São diferentes
- **WHEN** você escolhe "São diferentes"
- **THEN** as duas transações continuam, sem marcação, e o aviso não volta

#### Scenario: Nada pendente
- **WHEN** a resolução é pedida numa transação sem possível duplicata
- **THEN** a resposta é 409 com `code: "NO_DUPLICATE_PENDING"`
