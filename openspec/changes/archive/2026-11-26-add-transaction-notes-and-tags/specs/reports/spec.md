## ADDED Requirements

### Requirement: Relatórios por etiqueta
`GET /api/v1/reports/income-expense` e `GET /api/v1/reports/category-spending` MUST aceitar `tagId` e considerar só as transações com aquela etiqueta, com as mesmas regras de receita, despesa e gasto. As telas desses dois relatórios MUST ter o seletor de etiqueta junto do período, e "Todas" MUST ser o padrão.

#### Scenario: Quanto custou a viagem
- **WHEN** o usuário abre "Gasto por categoria" com a etiqueta "Viagem Chile"
- **THEN** o relatório mostra só os gastos com essa etiqueta, por categoria

#### Scenario: Etiqueta inexistente
- **WHEN** `tagId` não existe
- **THEN** a API responde 400 `VALIDATION_ERROR` com `tagId` em `details`
