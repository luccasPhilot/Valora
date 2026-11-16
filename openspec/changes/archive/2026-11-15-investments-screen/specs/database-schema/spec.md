## ADDED Requirements

### Requirement: Subtipo do investimento
A tabela `investments` MUST ter a coluna `subtype` (`text`, nula permitida). A migration MUST preencher as linhas já existentes com o valor de `raw->>'subtype'` quando houver.

#### Scenario: Linha antiga preenchida
- **WHEN** a migration roda num banco com um investimento cujo `raw` tem `"subtype": "CDB"`
- **THEN** a linha passa a ter `subtype` `CDB`

#### Scenario: Linha sem subtipo no raw
- **WHEN** o `raw` não tem `subtype`
- **THEN** a coluna fica nula
