## ADDED Requirements

### Requirement: Vínculos das metas
O banco MUST ter a tabela `goal_links` com `id`, `goal_id` (chave estrangeira para `goals`, `ON DELETE CASCADE`), `account_id` (para `accounts`, `ON DELETE CASCADE`), `investment_id` (para `investments`, `ON DELETE CASCADE`) e `created_at`. Exatamente uma entre `account_id` e `investment_id` MUST estar preenchida (`CHECK`). Um mesmo item MUST NOT aparecer duas vezes na mesma meta (índices únicos parciais por `goal_id` e item). A tabela `goals` MUST NOT ganhar colunas de vínculo.

#### Scenario: Vínculo com conta e com investimento ao mesmo tempo
- **WHEN** uma linha tenta preencher `account_id` e `investment_id`
- **THEN** o banco recusa a linha

#### Scenario: Vínculo sem item
- **WHEN** uma linha deixa `account_id` e `investment_id` nulos
- **THEN** o banco recusa a linha

#### Scenario: Item repetido na mesma meta
- **WHEN** a mesma conta é vinculada duas vezes à mesma meta
- **THEN** o banco recusa a segunda linha

#### Scenario: Mesmo item em metas diferentes
- **WHEN** o mesmo investimento é vinculado a duas metas
- **THEN** as duas linhas são aceitas

#### Scenario: Excluir a meta
- **WHEN** uma meta é excluída
- **THEN** os vínculos dela são apagados e as contas e os investimentos continuam
