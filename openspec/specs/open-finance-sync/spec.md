# open-finance-sync Specification

## Purpose
Leitura dos dados do Meu Pluggy pelo Open Finance: credenciais e bancos configurados, respostas validadas, gravação sem duplicar pelo id do Pluggy, valores em centavos com sinal normalizado, fotos diárias de saldo e investimentos, isolamento de falhas por banco, agendamento diário, disparo manual com execução única e histórico de execuções.

## Requirements

### Requirement: Credenciais e bancos configurados
A API MUST exigir `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` e `PLUGGY_ITEM_IDS` (lista de ids de itens separados por vírgula) na inicialização. As credenciais MUST NOT aparecer em logs, respostas ou mensagens de erro. Cada id de item MUST virar uma linha em `connections`.

#### Scenario: Credencial ausente
- **WHEN** a API inicia sem `PLUGGY_CLIENT_SECRET`
- **THEN** o processo termina com falha citando `PLUGGY_CLIENT_SECRET`, sem mostrar valores

#### Scenario: Banco novo na lista
- **WHEN** um id de item novo é adicionado a `PLUGGY_ITEM_IDS` e a sincronização roda
- **THEN** uma conexão nova é criada para esse item

### Requirement: Respostas do Pluggy validadas
Toda resposta do Pluggy MUST passar por um schema Zod antes de ser usada. Uma resposta inválida MUST fazer o banco (item) correspondente falhar, sem gravar dados parciais dele.

#### Scenario: Campo obrigatório ausente
- **WHEN** a resposta de transações de um item não traz o campo de valor
- **THEN** a sincronização desse item falha, nada dele é gravado, e os outros itens seguem normalmente

### Requirement: Contas gravadas pelo id do Pluggy
A sincronização MUST gravar ou atualizar cada conta usando `pluggy_account_id`, com o tipo convertido para `checking`, `savings` ou `credit_card` e o saldo em centavos.

#### Scenario: Conta já existente
- **WHEN** uma conta já gravada volta na sincronização com outro saldo
- **THEN** a linha existente é atualizada e nenhuma conta nova é criada

### Requirement: Foto diária do saldo
A cada sincronização, a API MUST gravar o saldo de cada conta em `balance_snapshots` com a data de hoje no fuso de São Paulo. Uma segunda sincronização no mesmo dia MUST atualizar a foto do dia em vez de criar outra.

#### Scenario: Duas sincronizações no mesmo dia
- **WHEN** a sincronização roda às 07:00 e de novo às 15:00 do mesmo dia
- **THEN** existe uma única foto do dia para cada conta, com o saldo das 15:00

### Requirement: Janela de transações
Na primeira sincronização de uma conexão, a API MUST buscar as transações dos últimos 365 dias. Nas seguintes, MUST buscar os últimos 30 dias.

#### Scenario: Primeira sincronização
- **WHEN** uma conexão nunca foi sincronizada
- **THEN** a busca de transações começa 365 dias antes de hoje

#### Scenario: Sincronização seguinte
- **WHEN** uma conexão já foi sincronizada antes
- **THEN** a busca de transações começa 30 dias antes de hoje

### Requirement: Transações sem duplicar
A sincronização MUST gravar ou atualizar cada transação do Open Finance pelo `pluggy_transaction_id`, com `source = 'open_finance'`. Rodar a sincronização duas vezes com os mesmos dados MUST NOT criar linhas novas. A atualização MUST NOT mudar a categoria efetiva de uma transação com `category_source = 'user'`.

#### Scenario: Sincronização repetida
- **WHEN** a sincronização roda duas vezes seguidas sem mudanças no banco do cliente
- **THEN** o número de transações no Valora é o mesmo depois das duas execuções

#### Scenario: Transação pendente confirmada
- **WHEN** uma transação pendente volta na sincronização seguinte com `status = posted` e o mesmo id
- **THEN** a linha existente passa a `posted`, sem criar outra

#### Scenario: Categoria escolhida pelo usuário
- **WHEN** uma transação com `category_source = 'user'` volta na sincronização com outra categoria sugerida pelo Pluggy
- **THEN** `category_id` e `category_source` continuam os mesmos, e só `pluggy_category` é atualizado

### Requirement: Pendentes que sumiram
Uma transação do Open Finance com `status = 'pending'` dentro da janela buscada que não voltar na resposta do Pluggy MUST ser apagada.

#### Scenario: Pendente cancelada
- **WHEN** uma transação pendente de 2 dias atrás não aparece mais na resposta do Pluggy
- **THEN** ela é apagada do Valora

#### Scenario: Confirmada que sumiu
- **WHEN** uma transação `posted` dentro da janela não aparece na resposta
- **THEN** ela continua no Valora

### Requirement: Transações manuais intocadas
A sincronização MUST NOT alterar nem apagar transações com `source = 'manual'`.

#### Scenario: Manual na janela
- **WHEN** existe uma transação manual numa conta conectada, dentro da janela de 30 dias, e a sincronização roda
- **THEN** a transação manual continua igual, com os mesmos valores e a mesma data de atualização

### Requirement: Valores em centavos e sinal normalizado
O `PluggyClient` MUST converter cada valor do Pluggy para centavos inteiros com arredondamento (`Math.round(valor * 100)`) e MUST normalizar o sinal para negativo = saída de dinheiro, tanto em conta quanto em cartão.

#### Scenario: Valor com casas decimais
- **WHEN** o Pluggy devolve uma compra de `89.9`
- **THEN** a transação é gravada com `amount_cents = -8990`

#### Scenario: Compra no cartão
- **WHEN** o Pluggy devolve uma compra no cartão de crédito, seja qual for o sinal que ele usa para cartão
- **THEN** a transação é gravada com valor negativo

#### Scenario: Estorno no cartão
- **WHEN** o Pluggy devolve um estorno no cartão de crédito
- **THEN** a transação é gravada com valor positivo

### Requirement: Descrição normalizada
Cada transação gravada MUST ter `description_normalized`: a descrição em maiúsculas, sem acentos, com espaços repetidos reduzidos a um e sem espaços nas pontas.

#### Scenario: Descrição com acento
- **WHEN** a descrição vem como `  Farmácia   São João `
- **THEN** `description_normalized` é `FARMACIA SAO JOAO`

### Requirement: Investimentos e foto diária
A sincronização MUST gravar ou atualizar cada investimento pelo `pluggy_investment_id`, com a posição em centavos, e MUST gravar a foto do dia em `investment_snapshots`.

#### Scenario: Investimento existente
- **WHEN** um investimento já gravado volta com outra posição
- **THEN** a linha é atualizada e a foto do dia guarda a posição nova

### Requirement: Falhas isoladas por banco
Cada banco (item) MUST ser sincronizado numa transação de banco de dados própria. A falha de um item MUST NOT impedir os outros. Item com erro de login ou consentimento expirado MUST deixar a conexão com `status = 'error'` ou `status = 'consent_expired'` e uma mensagem em `status_detail`.

#### Scenario: Um banco com consentimento expirado
- **WHEN** um de três itens está com o consentimento expirado
- **THEN** os outros dois são sincronizados, a conexão do terceiro fica `consent_expired` e a execução termina como `partial`

#### Scenario: Erro no meio de um item
- **WHEN** a gravação das transações de um item falha no meio
- **THEN** nada daquele item é gravado nessa execução

### Requirement: Sincronização agendada
A API MUST rodar a sincronização todo dia no horário de `SYNC_CRON`, interpretado no fuso `America/Sao_Paulo`.

#### Scenario: Horário padrão
- **WHEN** `SYNC_CRON` é `0 7 * * *` e são 07:00 em São Paulo
- **THEN** uma sincronização com `trigger = 'schedule'` começa

### Requirement: Disparo manual e execução única
`POST /api/v1/sync-runs` MUST iniciar uma sincronização com `trigger = 'manual'` e responder 202 com o id e o status da execução. Se já houver uma sincronização em andamento, MUST responder 409 com `code: "SYNC_IN_PROGRESS"`. Duas sincronizações MUST NOT rodar ao mesmo tempo, mesmo quando o agendamento e o disparo manual coincidem.

#### Scenario: Disparo manual
- **WHEN** `POST /api/v1/sync-runs` é chamado sem sincronização em andamento
- **THEN** a resposta é 202 com `status: "running"`

#### Scenario: Já em andamento
- **WHEN** `POST /api/v1/sync-runs` é chamado durante uma sincronização
- **THEN** a resposta é 409 com `code: "SYNC_IN_PROGRESS"`

### Requirement: Histórico de execuções
Cada sincronização MUST ficar registrada em `sync_runs` com início, fim, status (`running`, `success`, `partial`, `failed`), gatilho e quantidades (contas, transações novas, atualizadas e removidas). `error_message` MUST NOT conter valores, descrições ou credenciais. `GET /api/v1/sync-runs/latest` MUST devolver a última execução.

#### Scenario: Execução concluída
- **WHEN** uma sincronização termina sem erros
- **THEN** a execução fica `success`, com `finished_at` preenchido e as quantidades em `stats`

#### Scenario: Nenhuma execução ainda
- **WHEN** `GET /api/v1/sync-runs/latest` é chamado antes da primeira sincronização
- **THEN** a resposta é 404 com `code: "NOT_FOUND"`

### Requirement: Lista de conexões
`GET /api/v1/connections` MUST devolver cada conexão **ativa** (não arquivada) com o nome da instituição, o status, a mensagem de status, a data da última sincronização e `isConfigured`. Conexões arquivadas MUST ser listadas só com `?archived=true` (ver `bank-archiving`).

#### Scenario: Conexões listadas
- **WHEN** existem três conexões ativas e uma está com erro
- **THEN** a resposta lista as três, e a com erro traz `status: "error"` e a mensagem

#### Scenario: Conexão arquivada
- **WHEN** existe uma quarta conexão, arquivada
- **THEN** ela não aparece em `GET /connections`

### Requirement: Bancos arquivados são pulados
A sincronização MUST NOT ler o Pluggy nem alterar o status de uma conexão arquivada, mesmo que o id dela continue no `PLUGGY_ITEM_IDS`. Um banco pulado MUST NOT fazer a execução virar `partial` nem `failed`.

#### Scenario: Arquivado com o id no .env
- **WHEN** a conexão está arquivada e o id continua no `PLUGGY_ITEM_IDS`
- **THEN** nenhuma chamada é feita ao Pluggy para esse banco, o status dele não muda e a execução termina `success` se os outros bancos deram certo

#### Scenario: Conexão arquivada não é recriada
- **WHEN** a sincronização roda com o id de um banco arquivado no `PLUGGY_ITEM_IDS`
- **THEN** não nasce uma conexão nova para esse id

### Requirement: Banco que não existe mais no Pluggy
Quando o Pluggy responder que o item não existe, a sincronização MUST gravar na conexão o status `item_not_found` com a mensagem "Este banco foi removido do Meu Pluggy. Remova-o do Valora.", sem tratar o caso como uma falha genérica. Outras falhas MUST continuar como `error`. O `PluggyClient` MUST continuar sendo o único ponto de contato com o Pluggy.

#### Scenario: Item removido do Meu Pluggy
- **WHEN** a consulta do item responde "não encontrado"
- **THEN** a conexão fica com `status: "item_not_found"` e a mensagem acima, e os outros bancos seguem sendo sincronizados

#### Scenario: Falha qualquer
- **WHEN** a consulta do item falha por erro de rede ou resposta inválida
- **THEN** a conexão fica com `status: "error"` e a mensagem genérica de sempre

#### Scenario: Banco volta a existir
- **WHEN** um banco com `item_not_found` volta a responder normalmente
- **THEN** a conexão volta a `ok` na sincronização seguinte
