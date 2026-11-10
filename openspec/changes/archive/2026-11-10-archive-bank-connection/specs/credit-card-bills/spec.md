## ADDED Requirements

### Requirement: Cartões de bancos arquivados ficam de fora
`GET /api/v1/credit-card-bills` MUST NOT trazer cartões de bancos arquivados, e as faturas deles MUST NOT entrar na fatura em aberto nem na projeção do mês. As faturas gravadas MUST continuar no banco.

#### Scenario: Banco arquivado
- **WHEN** o banco do cartão "Visa" está arquivado
- **THEN** o cartão não aparece na resposta e a fatura dele não entra na projeção do fim do mês

#### Scenario: Reativado
- **WHEN** o banco é reativado
- **THEN** o cartão volta à resposta com as faturas que já estavam gravadas
