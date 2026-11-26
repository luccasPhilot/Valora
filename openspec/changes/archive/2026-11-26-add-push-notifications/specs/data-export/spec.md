## MODIFIED Requirements

### Requirement: Baixar meus dados
`GET /api/v1/exports/all.zip` MUST devolver um `.zip` com um CSV por tabela de dados do Valora, com as colunas do banco, valores em centavos inteiros, datas `AAAA-MM-DD`, instantes ISO 8601 e um `LEIA-ME.txt`. A coluna `raw` MUST ficar de fora, e a tabela `push_subscriptions` (endereço e chaves das inscrições de push) MUST ficar de fora. Os dados MUST ser lidos de uma foto consistente do banco. O log MUST registrar só o número de linhas por tabela. Ajustes MUST ter "Baixar meus dados", com carregando e erro.

#### Scenario: Conteúdo do arquivo
- **WHEN** o usuário baixa os dados
- **THEN** o `.zip` tem `transactions.csv`, `accounts.csv`, `balance_snapshots.csv`, `investment_snapshots.csv` e as demais tabelas, e nenhum CSV tem a coluna `raw`

#### Scenario: Inscrições de push
- **WHEN** o usuário baixa os dados com um aparelho inscrito nas notificações
- **THEN** o `.zip` não tem `push_subscriptions.csv` e nenhum arquivo traz o endereço nem as chaves da inscrição

#### Scenario: Centavos
- **WHEN** existe uma compra de R$ 89,90
- **THEN** `transactions.csv` traz `amount_cents` igual a `-8990`

#### Scenario: Sincronização no meio
- **WHEN** a sincronização grava transações enquanto o `.zip` é montado
- **THEN** o `.zip` tem uma foto coerente: nenhuma transação aponta para uma conta que não está em `accounts.csv`

#### Scenario: Log
- **WHEN** a exportação termina
- **THEN** o log tem só as contagens de linhas, sem valores nem descrições
