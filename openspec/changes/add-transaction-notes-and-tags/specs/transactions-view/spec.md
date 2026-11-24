## ADDED Requirements

### Requirement: Filtro por etiqueta e busca na nota
`GET /api/v1/transactions` e `GET /api/v1/transactions/summary` MUST aceitar `tagId` e trazer só as transações com aquela etiqueta. A busca MUST encontrar o termo também na nota, sem diferenciar maiúsculas e acentos. A tela MUST ter o filtro "Etiqueta" junto dos outros filtros, com o chip "Etiqueta: <nome>".

#### Scenario: Filtrar pela viagem
- **WHEN** o usuário filtra pela etiqueta "Viagem Chile"
- **THEN** a lista e o resumo mostram só as transações com essa etiqueta

#### Scenario: Buscar na nota
- **WHEN** a busca é `reembolso` e uma compra tem a nota "Pedir reembolso à empresa"
- **THEN** a compra aparece no resultado
