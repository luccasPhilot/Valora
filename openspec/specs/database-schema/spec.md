# database-schema Specification

## Purpose
Schema do PostgreSQL do Valora: migrations versionadas, tabelas da v1 e as regras que o banco garante (dinheiro em centavos, unicidade pelo id do Pluggy, valores permitidos, fotos diárias, orçamento por mês e datas no fuso de São Paulo).

## Requirements

### Requirement: Migrations versionadas e automáticas
O schema do banco MUST ser criado por migrations SQL versionadas no repositório e aplicadas automaticamente quando a API inicia. Aplicar as migrations num banco já atualizado MUST NOT alterar nada.

#### Scenario: Banco vazio
- **WHEN** a API inicia apontando para um banco vazio
- **THEN** todas as tabelas da v1 são criadas antes de a API aceitar requisições

#### Scenario: Banco já atualizado
- **WHEN** a API reinicia sem migrations novas
- **THEN** nenhuma tabela, coluna ou dado é alterado

### Requirement: Tabelas da v1
O banco MUST ter as tabelas `connections`, `accounts`, `balance_snapshots`, `transactions`, `categories`, `category_rules`, `pluggy_category_mappings`, `budgets`, `investments`, `investment_snapshots` e `sync_runs`, com as colunas descritas em `docs/04-modelo-de-dados.md`, incluindo `transactions.source`, `transactions.possible_duplicate_of_id` e o tipo de conta `cash`.

#### Scenario: Estrutura criada
- **WHEN** as migrations terminam num banco vazio
- **THEN** as onze tabelas existem com as colunas, chaves estrangeiras e índices do modelo de dados

### Requirement: Dinheiro em centavos inteiros
Toda coluna de valor em dinheiro MUST ser `bigint` e ter o sufixo `_cents`. O código da API MUST representar esses valores como inteiros e rejeitar valores com casas decimais antes de gravar.

#### Scenario: Valor com casas decimais
- **WHEN** o código tenta gravar `amount_cents = 89.9`
- **THEN** a gravação é rejeitada com um erro de validação

#### Scenario: Valor negativo
- **WHEN** uma transação de saída é gravada com `amount_cents = -8990`
- **THEN** o valor é aceito e lido de volta como `-8990`

### Requirement: Unicidade pelo id do Pluggy
Cada coluna `pluggy_*_id` MUST ser única quando preenchida e MUST aceitar nulo em mais de uma linha (conta "Dinheiro" e transações manuais).

#### Scenario: Id do Pluggy repetido
- **WHEN** duas transações são gravadas com o mesmo `pluggy_transaction_id`
- **THEN** a segunda gravação é rejeitada pelo banco

#### Scenario: Várias transações manuais
- **WHEN** duas transações manuais são gravadas com `pluggy_transaction_id` nulo
- **THEN** as duas são aceitas

### Requirement: Valores permitidos
Colunas com um conjunto fechado de valores (`type`, `status`, `kind`, `source`, `category_source`, `match_type`, `trigger`) MUST ser restringidas no banco, e um valor fora do conjunto MUST ser rejeitado.

#### Scenario: Status desconhecido
- **WHEN** uma transação é gravada com `status = 'cancelled'`
- **THEN** o banco rejeita a gravação

### Requirement: Uma foto por dia
`balance_snapshots` e `investment_snapshots` MUST ter no máximo uma linha por conta (ou investimento) por dia.

#### Scenario: Segunda foto no mesmo dia
- **WHEN** uma segunda foto do mesmo dia é gravada para a mesma conta
- **THEN** a gravação atualiza o valor existente em vez de criar outra linha

### Requirement: Orçamento por mês
`budgets` MUST ter no máximo um orçamento por categoria e mês, e `month` MUST ser sempre o dia 1.

#### Scenario: Mês fora do padrão
- **WHEN** um orçamento é gravado com `month = 2026-11-15`
- **THEN** o banco rejeita a gravação

### Requirement: Datas no fuso de São Paulo
O "dia de hoje" usado pela API e pelo front MUST ser calculado no fuso `America/Sao_Paulo`, seja qual for o fuso do servidor ou do aparelho.

#### Scenario: Servidor em UTC perto da meia-noite
- **WHEN** são 01:00 de 4 de novembro em UTC (22:00 de 3 de novembro em São Paulo)
- **THEN** o utilitário de data retorna 3 de novembro como hoje

### Requirement: Subtipo do investimento
A tabela `investments` MUST ter a coluna `subtype` (`text`, nula permitida). A migration MUST preencher as linhas já existentes com o valor de `raw->>'subtype'` quando houver.

#### Scenario: Linha antiga preenchida
- **WHEN** a migration roda num banco com um investimento cujo `raw` tem `"subtype": "CDB"`
- **THEN** a linha passa a ter `subtype` `CDB`

#### Scenario: Linha sem subtipo no raw
- **WHEN** o `raw` não tem `subtype`
- **THEN** a coluna fica nula

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
