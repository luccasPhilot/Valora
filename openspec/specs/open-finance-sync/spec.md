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
Na primeira sincronização de uma conexão (`last_synced_at` nulo), a API MUST buscar as transações dos últimos 365 dias. Nas seguintes, a busca MUST começar no dia da última sincronização bem-sucedida do banco (`last_synced_at`, no fuso `America/Sao_Paulo`) menos 7 dias de margem, MUST começar pelo menos 30 dias antes de hoje e MUST NOT começar mais de 365 dias antes de hoje. A busca MUST terminar hoje. A regra MUST valer também para o banco que ficou em erro ou com o consentimento vencido e para o banco reativado depois de arquivado, já que `last_synced_at` só muda numa sincronização bem-sucedida.

#### Scenario: Primeira sincronização
- **WHEN** uma conexão nunca foi sincronizada
- **THEN** a busca de transações começa 365 dias antes de hoje

#### Scenario: Sincronização seguinte
- **WHEN** a última sincronização bem-sucedida do banco foi ontem
- **THEN** a busca de transações começa 30 dias antes de hoje

#### Scenario: Parado menos de 30 dias
- **WHEN** hoje é 18/11/2026 e a última sincronização bem-sucedida do banco foi em 08/11/2026
- **THEN** a busca começa em 19/10/2026, 30 dias antes de hoje

#### Scenario: Banco parado mais de 30 dias
- **WHEN** hoje é 18/11/2026 e o banco ficou com o consentimento vencido desde a última sincronização bem-sucedida, em 09/09/2026
- **THEN** a busca começa em 02/09/2026 e termina em 18/11/2026

#### Scenario: Banco reativado
- **WHEN** hoje é 18/11/2026 e o usuário reativa um banco arquivado cuja última sincronização bem-sucedida foi em 01/06/2026
- **THEN** a próxima sincronização busca as transações a partir de 25/05/2026

#### Scenario: Parado mais de um ano
- **WHEN** a última sincronização bem-sucedida do banco foi há 400 dias
- **THEN** a busca começa 365 dias antes de hoje

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
Uma transação do Open Finance com `status = 'pending'` dentro da janela buscada que não voltar na resposta do Pluggy MUST ser apagada, com uma exceção: a pendente com decisão do usuário (categoria com `category_source = 'user'` ou ocorrência de previsão vinculada) sem postada equivalente MUST ficar enquanto hoje não passar de 5 dias depois da data dela (requisito "Decisão do usuário na troca de pendente por postada"). As pendentes que sumiram MUST ser apagadas antes da detecção de possível duplicata da mesma conta, na mesma transação do banco de dados.

#### Scenario: Pendente cancelada
- **WHEN** uma transação pendente de 2 dias atrás, sem categoria do usuário e sem vínculo com previsão, não aparece mais na resposta do Pluggy
- **THEN** ela é apagada do Valora

#### Scenario: Confirmada que sumiu
- **WHEN** uma transação `posted` dentro da janela não aparece na resposta
- **THEN** ela continua no Valora

#### Scenario: Pendente apagada antes das duplicatas
- **WHEN** na mesma sincronização uma pendente some e uma postada nova chega na mesma conta
- **THEN** a pendente é apagada antes de a postada nova ser comparada com as transações manuais

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
A sincronização MUST gravar ou atualizar cada investimento pelo `pluggy_investment_id`, com a posição em centavos, o `type` e o `subtype` (nulo quando o Pluggy não manda), e MUST gravar a foto do dia em `investment_snapshots` de cada investimento que veio na resposta, inclusive os que vêm com saldo zero (como os de `status = TOTAL_WITHDRAWAL`). Todo investimento do banco que **não veio** na resposta e tem posição diferente de zero MUST passar a ter posição `0`, com a foto do dia `0`, inclusive quando a resposta vem vazia, **somente** quando a coleta de investimentos do item foi completa: `status = UPDATED` e `executionStatus = SUCCESS`, ou `executionStatus = PARTIAL_SUCCESS` com `statusDetail.investments.isUpdated = true`. Em qualquer outro caso (coleta parcial, atualização em andamento, `executionStatus` ausente ou desconhecido), a sincronização MUST NOT zerar investimentos ausentes nem gravar foto para eles. Um banco com erro MUST NOT ter investimentos alterados.

#### Scenario: Investimento existente
- **WHEN** um investimento já gravado volta com outra posição
- **THEN** a linha é atualizada e a foto do dia guarda a posição nova

#### Scenario: Subtipo gravado
- **WHEN** o Pluggy manda `type` `FIXED_INCOME` e `subtype` `CDB`
- **THEN** a linha guarda os dois

#### Scenario: Resgate total informado pelo Pluggy
- **WHEN** um CDB de `50000` centavos volta na resposta com `status = TOTAL_WITHDRAWAL` e saldo zero
- **THEN** a posição passa a `0` e a foto do dia guarda `0`, qualquer que seja o estado da coleta

#### Scenario: Investimento que sumiu
- **WHEN** a coleta foi completa e um CDB de `50000` centavos já gravado não vem mais na resposta do banco
- **THEN** a posição passa a `0` e a foto do dia guarda `0`

#### Scenario: Lista vazia
- **WHEN** a coleta foi completa e o banco devolve zero investimentos, mas há três gravados com saldo
- **THEN** os três passam a `0`

#### Scenario: Coleta parcial
- **WHEN** o item vem com `executionStatus = PARTIAL_SUCCESS` e `statusDetail.investments.isUpdated = false`, e um CDB de `50000` centavos já gravado não vem na resposta
- **THEN** a posição continua `50000` e nenhuma foto do dia é gravada para ele

#### Scenario: Banco atualizando
- **WHEN** o item está com `status = UPDATING` e a lista de investimentos vem vazia, mas há três gravados com saldo
- **THEN** os três continuam com a posição anterior e sem foto `0`

#### Scenario: Banco com erro
- **WHEN** a sincronização do banco falha
- **THEN** nenhum investimento dele é alterado

#### Scenario: Volta depois de sumir
- **WHEN** um investimento zerado por ter sumido volta na resposta seguinte com `50000` centavos
- **THEN** a posição e a foto do dia voltam a `50000`

### Requirement: Falhas isoladas por banco
Cada banco (item) MUST ser sincronizado numa transação de banco de dados própria. A falha de um item MUST NOT impedir os outros, inclusive quando a falha acontece ao criar a conexão ou ao gravar o status dela. Item com erro de login ou consentimento expirado MUST deixar a conexão com `status = 'error'` ou `status = 'consent_expired'` e uma mensagem em `status_detail`. Se só o registro do fim da execução em `sync_runs` falhar, a API MUST NOT trocar o resultado calculado por `failed`; o log MUST guardar só o tipo do erro.

#### Scenario: Um banco com consentimento expirado
- **WHEN** um de três itens está com o consentimento expirado
- **THEN** os outros dois são sincronizados, a conexão do terceiro fica `consent_expired` e a execução termina como `partial`

#### Scenario: Erro no meio de um item
- **WHEN** a gravação das transações de um item falha no meio
- **THEN** nada daquele item é gravado nessa execução

#### Scenario: Banco de dados falha fora da gravação do item
- **WHEN** a criação da conexão ou a gravação do status do segundo de três itens falha por erro do banco de dados
- **THEN** o segundo conta como falha, o primeiro e o terceiro são sincronizados e a execução termina como `partial`

#### Scenario: Falha só ao fechar a execução
- **WHEN** todos os bancos sincronizam e a primeira gravação do fim da execução em `sync_runs` falha
- **THEN** a execução não é regravada como `failed` com estatísticas zeradas, e o log guarda só o tipo do erro

### Requirement: Sincronização agendada
A API MUST rodar a sincronização todo dia no horário de `SYNC_CRON`, interpretado no fuso `America/Sao_Paulo`. Ao subir, se o último horário do `SYNC_CRON` já passou hoje e existe banco ativo (no `PLUGGY_ITEM_IDS` e não arquivado) sem sincronização bem-sucedida hoje, a API MUST disparar uma sincronização com `trigger = 'schedule'` só desses bancos, sem esperar o fim dela para atender requisições e respeitando o lock de execução única. Quando uma execução agendada termina com algum banco ativo sem sincronização bem-sucedida hoje, a API MUST tentar de novo **uma vez**, 3 horas depois, só esses bancos, desde que a tentativa caia no mesmo dia em São Paulo. A segunda tentativa MUST NOT agendar outra, e a execução manual MUST NOT agendar segunda tentativa.

#### Scenario: Horário padrão
- **WHEN** `SYNC_CRON` é `0 7 * * *` e são 07:00 em São Paulo
- **THEN** uma sincronização com `trigger = 'schedule'` começa

#### Scenario: API sobe depois do horário sem sincronização no dia
- **WHEN** `SYNC_CRON` é `0 7 * * *`, a API sobe às 09:30 em São Paulo e nenhum banco sincronizou hoje
- **THEN** uma sincronização com `trigger = 'schedule'` começa para todos os bancos ativos

#### Scenario: API sobe antes do horário
- **WHEN** `SYNC_CRON` é `0 7 * * *` e a API sobe às 06:00 em São Paulo
- **THEN** nenhuma sincronização começa na subida, e a das 07:00 roda normalmente

#### Scenario: API sobe com o dia já sincronizado
- **WHEN** a API sobe às 09:30 e todos os bancos ativos já sincronizaram com sucesso hoje
- **THEN** nenhuma sincronização começa na subida

#### Scenario: Recuperação com sincronização em andamento
- **WHEN** a recuperação da subida tenta começar e outra sincronização já está rodando
- **THEN** a recuperação só registra no log que pulou, sem criar outra execução

#### Scenario: Segunda tentativa para o banco que falhou
- **WHEN** a sincronização das 07:00 termina `partial` porque um de três bancos falhou
- **THEN** 3 horas depois do fim dela (por volta das 10:00) uma sincronização com `trigger = 'schedule'` lê só esse banco

#### Scenario: Uma segunda tentativa por dia
- **WHEN** a segunda tentativa das 10:00 também falha para o banco
- **THEN** nenhuma outra tentativa é agendada nesse dia

#### Scenario: Segunda tentativa que passaria da meia-noite
- **WHEN** `SYNC_CRON` é `0 22 * * *` e a execução das 22:00 termina com um banco sem sincronizar
- **THEN** nenhuma segunda tentativa é agendada

#### Scenario: Banco sincronizado à mão antes da segunda tentativa
- **WHEN** a sincronização das 07:00 falhou para um banco e o usuário o sincronizou com sucesso pelo botão às 08:00
- **THEN** na hora da segunda tentativa nenhuma execução nova é criada

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

### Requirement: Decisão do usuário na troca de pendente por postada
Quando uma pendente do Open Finance some da resposta do Pluggy e tem decisão do usuário (`category_source = 'user'` ou uma ocorrência de previsão vinculada em `planned_entry_occurrences`), a sincronização MUST procurar a postada equivalente: transação do Open Finance com `status = 'posted'`, na mesma conta, com o mesmo `amount_cents`, data de 1 dia antes a 5 dias depois da data da pendente, gravada no Valora depois da pendente e ainda não escolhida por outra pendente na mesma execução. A candidata MUST ser a de data mais próxima; se duas ou mais empatam na menor distância, MUST ser tratado como "sem candidata". Com candidata, na mesma transação do banco de dados e antes de apagar a pendente, a sincronização MUST:
- passar a categoria da pendente para a postada, com `category_source = 'user'`, a menos que a postada já tenha `category_source = 'user'`, caso em que a categoria dela MUST NOT mudar;
- passar o vínculo da ocorrência de previsão para a postada, a menos que a postada já realize outra ocorrência.

Sem candidata, a pendente MUST NOT ser apagada enquanto hoje for no máximo 5 dias depois da data dela; depois disso MUST ser apagada como as outras pendentes que sumiram. A sincronização MUST NOT mexer em transações manuais nem juntar transações, e o log MUST guardar só quantidades (decisões levadas, pendentes mantidas, empates), nunca valores ou descrições.

#### Scenario: Pendente categorizada vira postada com outro id
- **WHEN** a pendente de `−8990` centavos de 10/11, no cartão, com categoria "Restaurantes" escolhida pelo usuário, some e chega uma postada de `−8990` centavos de 11/11 no mesmo cartão, com outro id
- **THEN** a postada fica com "Restaurantes" e `category_source = 'user'`, e a pendente é apagada

#### Scenario: Previsão vinculada à pendente
- **WHEN** a pendente que realizava a ocorrência de novembro de uma previsão some e a postada equivalente chega
- **THEN** a ocorrência passa a apontar para a postada e continua `realized`

#### Scenario: Postada já categorizada pelo usuário
- **WHEN** a postada equivalente já tem uma categoria escolhida pelo usuário, diferente da pendente
- **THEN** a categoria da postada não muda, e a pendente é apagada

#### Scenario: Duas candidatas na mesma distância
- **WHEN** a pendente de `−5000` centavos de 10/11 some e chegam duas postadas de `−5000` centavos de 11/11 na mesma conta
- **THEN** nenhuma recebe a categoria, a pendente fica e o log registra um empate

#### Scenario: Duas candidatas em distâncias diferentes
- **WHEN** a pendente de 10/11 some e chegam postadas equivalentes de 11/11 e de 13/11
- **THEN** a de 11/11 recebe a categoria, e a de 13/11 continua como estava

#### Scenario: Sem candidata dentro do prazo
- **WHEN** hoje é 12/11, a pendente categorizada de 10/11 some e nenhuma postada equivalente chegou
- **THEN** a pendente continua no Valora com a categoria

#### Scenario: Postada chega depois
- **WHEN** a pendente categorizada de 10/11 sumiu em 12/11 e ficou, e a postada equivalente chega em 13/11
- **THEN** em 13/11 a postada recebe a categoria e a pendente é apagada

#### Scenario: Sem candidata depois do prazo
- **WHEN** hoje é 16/11 e a pendente categorizada de 10/11 continua sem postada equivalente
- **THEN** a pendente é apagada

#### Scenario: Valor diferente
- **WHEN** a pendente categorizada é de `−8990` centavos e a postada que chega no mesmo cartão é de `−9050` centavos
- **THEN** a postada não recebe a categoria

#### Scenario: Pendente sem decisão do usuário
- **WHEN** some uma pendente com categoria automática e sem vínculo com previsão
- **THEN** ela é apagada na hora, sem procurar postada equivalente

