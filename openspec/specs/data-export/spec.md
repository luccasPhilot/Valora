# data-export Specification

## Purpose
Saídas legíveis dos dados, além do backup do servidor: o CSV das transações do filtro de Transações, feito para o Excel em pt-BR, e o `.zip` com um CSV por tabela do Valora, em "Baixar meus dados", para guardar e reprocessar.
## Requirements
### Requirement: CSV das transações do filtro
A tela de Transações MUST ter "Exportar CSV", que baixa todas as transações do filtro atual (não só a página carregada) num arquivo UTF-8 com BOM, separador `;`, com as colunas Data (`dd/mm/aaaa`), Descrição, Categoria, Tipo, Conta, Valor, Situação, Origem e Parcela. O valor MUST ter vírgula decimal, sinal `-` nas saídas e nenhum "R$". O arquivo MUST ser montado no front a partir da API. Enquanto prepara, a tela MUST mostrar o progresso e permitir cancelar. Acima de 10.000 transações, MUST pedir para estreitar o filtro em vez de exportar.

#### Scenario: Abrir no Excel
- **WHEN** o usuário exporta novembro de 2026 e abre o arquivo no Excel em pt-BR
- **THEN** cada coluna fica numa célula, "Farmácia São João" aparece com acentos e `-89,90` é lido como número

#### Scenario: Filtro aplicado
- **WHEN** o filtro é "Transporte" em outubro e há 130 transações
- **THEN** o arquivo tem as 130, em duas páginas buscadas da API, e nenhuma de outra categoria

#### Scenario: Texto com ponto e vírgula e aspas
- **WHEN** uma descrição é `LOJA "A; B"`
- **THEN** o campo sai entre aspas, com as aspas internas dobradas, e não quebra as colunas

#### Scenario: Valores ocultos
- **WHEN** "Ocultar valores" está ligado e o usuário aciona "Exportar CSV"
- **THEN** a tela avisa que o arquivo terá os valores antes de baixar

#### Scenario: Muitas transações
- **WHEN** o filtro tem 12.000 transações
- **THEN** a tela pede para estreitar o período e nada é baixado

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
