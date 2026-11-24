## Context

A sincronização (`backend/src/modules/sync/`) roda uma vez por dia pelo `croner` e pelo botão. Para cada item do `PLUGGY_ITEM_IDS`, o `SyncService.syncItem` garante a conexão, consulta o item, busca tudo no Pluggy e grava numa transação do banco (`SyncUnitOfWork`). A revisão de 18/11/2026 (`docs/08`, itens S1–S5 e S8) achou seis pontos em que um dado se perde em silêncio. Cada um, no código de hoje:

- **S1, `windowFor`:** `lastSyncedAt === null ? 365 : 30`. `last_synced_at` só muda em `markSynced`, no fim de uma gravação bem-sucedida; arquivar e reativar não mexe nele. Um banco parado 70 dias volta buscando 30, e 40 dias nunca entram.
- **S2, `deleteMissingPending`:** apaga toda pendente `open_finance` da janela cujo id não voltou, sem olhar `category_source`. No cartão, a pendente costuma virar postada com **outro id**: a categoria escolhida some, e os vínculos que apontam para a pendente viram `NULL` (`planned_entry_occurrences.transaction_id` e `category_rules.learned_from_transaction_id` são `ON DELETE SET NULL`). `alerts.transaction_id` também é `SET NULL`, mas os detectores de evento só olham postadas (`charge-row.ts`), então nenhum alerta aponta para pendente. Dados reais: 10 pendentes, 2 com categoria do usuário.
- **S3, `saveTransactions`:** a ordem é upsert → `markPossibleDuplicates(insertedIds)` → `deleteMissingPending`. A manual ainda está apontada pela pendente quando a postada nova é checada (`matchingFreeManual` exige manual sem `claimant`); depois a pendente some e ninguém checa de novo.
- **S4, `InvestmentsRepository.upsertWithSnapshots`:** `zeroVanished` roda sempre que o banco grava. `pluggyItemSchema` valida `executionStatus`, mas nada o usa, e `statusDetail` nem é lido. `mapItemStatus` deixa `UPDATING`/`MERGING` lerem dados (`syncing`, `canReadData: true`).
- **S5, `sync.schedule.ts` e `server.ts`:** o `Cron` não recupera disparo perdido. API desligada ou reiniciando às 07:00, ou falha passageira de um banco, deixa o dia sem foto de saldo e de investimentos.
- **S8, `syncItem` e `execute`:** `connections.ensure`, `updateConnectionStatus` e o `updateStatus` dentro de `recordFailure` ficam fora do `attempt`; uma exceção ali sobe até `execute`, que fecha a execução inteira como `failed` com `EMPTY_STATS`. O mesmo acontece se só `syncRuns.finish` falhar.

Restrições: regras 3, 4, 7 e 9 do `CLAUDE.md`; camadas Service → Repository; o `PluggyClient` é o único que fala com o Pluggy; testes nunca chamam o Pluggy (fixtures anonimizadas em `backend/test/fixtures/pluggy/`, que hoje só têm itens `UPDATED`/`SUCCESS`, sem `statusDetail`).

## Goals / Non-Goals

**Goals:**
- Nenhuma transação deixa de entrar por causa do tamanho da janela, até o limite de 12 meses do Open Finance.
- A categoria escolhida pelo usuário e o vínculo com previsão sobrevivem à troca pendente → postada.
- A postada que substitui uma pendente é comparada com as manuais.
- Uma coleta parcial do Pluggy não zera posições nem grava foto `0` falsa.
- O dia não fica sem foto porque o cron não rodou ou um banco falhou de manhã.
- Erro de banco de dados num item não derruba os outros nem apaga as estatísticas reais.

**Non-Goals:**
- S6, S7, S9, S10, S11, S12 e S13 da revisão.
- O ping do healthchecks.io (change `harden-backups`).
- Aviso na tela de dia sem foto, repetição no dia seguinte e histórico de sincronizações na tela.
- Mudança de API, de tela ou de tabela.

## Decisions

### 1. Janela a partir da última sincronização bem-sucedida (S1)

`from = max(hoje − 365, min(hoje − 30, dia(last_synced_at) − 7))`, `to = hoje`, com `dia()` no fuso de São Paulo (`toSaoPauloDate`) e as contas por `subtractDays`. Sem `last_synced_at`, 365 como hoje. Vira uma função pura `transactionWindowFor(lastSyncedAt, now)` em `modules/sync/transaction-window.ts`, com testes unitários nas fronteiras, e `windowFor` passa a chamá-la. Constantes: `FIRST_SYNC_DAYS = 365`, `MIN_SYNC_DAYS = 30`, `RESUME_MARGIN_DAYS = 7`.

**Por que 7 dias de margem:** cobre transação lançada com data anterior à da última leitura (postagem atrasada, a data em UTC do Pluggy) sem depender dos 30 dias mínimos. Só pesa quando o banco ficou parado mais de 23 dias; nos outros casos a janela continua 30.

**Por que nunca menos de 30:** pendentes do cartão mudam ou somem dentro desse prazo; é o motivo da janela de hoje.

**Banco reativado:** nada a fazer além disso, porque reativar só limpa `archived_at` e `last_synced_at` continua o da última leitura.

**Alternativa descartada:** coluna nova com a última data de transação lida. `last_synced_at` já diz o mesmo e não exige migration.

### 2. Decisão do usuário levada da pendente para a postada (S2)

**Quais pendentes:** as que sumiram (mesmo filtro de `deleteMissingPending`) e têm decisão do usuário: `category_source = 'user'` **ou** linha em `planned_entry_occurrences` apontando para elas. Pendente sem decisão é apagada na hora, como hoje.

**Candidata (postada equivalente):** `source = 'open_finance'`, `status = 'posted'`, mesma conta, mesmo `amount_cents`, `date` entre `pendente.date − 1` e `pendente.date + 5`, `created_at >= pendente.created_at` e ainda não escolhida por outra pendente nesta execução.
- **De 1 dia antes a 5 depois:** a postada costuma vir com a mesma data ou alguns dias depois; o dia antes cobre a data em UTC que o Pluggy às vezes manda à meia-noite (o mesmo efeito já tratado nas faturas). Constantes `PENDING_MATCH_DAYS_BEFORE = 1` e `PENDING_MATCH_DAYS_AFTER = 5`.
- **"Chegou depois da pendente" em vez de "inserida nesta execução":** às vezes a postada chega um dia antes de a pendente sumir (as duas vêm juntas numa resposta). Exigir "inserida nesta execução" perderia esse caso. `created_at` posterior ao da pendente mantém a regra de que só uma transação que chegou para substituí-la conta.
- **Desempate:** a de menor `abs(date − pendente.date)`. Se duas ou mais empatam nessa menor distância, **não leva** e trata como sem candidata (o log conta um empate). Escolher pelo id ou pela ordem de chegada daria a categoria a uma compra por sorte; errar a categoria em silêncio é pior do que esperar.
- **Uma candidata por pendente:** as pendentes da conta são processadas em ordem de data e id, e as postadas já escolhidas ficam fora das seguintes.

**Com candidata, na mesma transação do banco, antes de apagar:**
- categoria: `category_id` da pendente e `category_source = 'user'` na postada, **a menos que** a postada já tenha `category_source = 'user'` (regra 3 vale para ela também). Como a candidata nova tem categoria nula e o `Categorizer` roda depois e pula `user`, a categoria fica;
- previsão: `planned_entry_occurrences.transaction_id` passa da pendente para a postada, a menos que a postada já realize outra ocorrência (índice único `planned_entry_occurrences_transaction_id_key`); nesse caso o vínculo vira `NULL` pela cascata, como hoje. Mover o vínculo não é uma decisão nova do app: é a decisão do usuário seguindo a mesma compra, então não contraria "vínculo previsão × transação sempre manual";
- a pendente é apagada. `category_rules.learned_from_transaction_id` vira `NULL` pela cascata; a regra aprendida continua valendo. Levar a categoria **não** aprende regra nova (o aprendizado é só na correção feita pelo usuário).

**Sem candidata (ou empate):** a pendente **fica** enquanto `hoje <= pendente.date + 5` (o mesmo prazo da janela de busca) e é apagada depois disso. Assim:
- a postada que chega um ou dois dias depois ainda encontra a pendente e herda a decisão (cenário "Postada chega depois");
- a compra cancelada de verdade, ou a postada que veio com outro valor, não deixa uma pendente presa para sempre. O usuário não consegue apagar uma transação do Open Finance, então manter sem prazo deixaria um gasto falso nos totais sem saída.

**Por que não "apagar mesmo sem candidata":** é exatamente a perda de hoje. **Por que não "nunca apagar pendente categorizada":** uma compra cancelada contaria para sempre nos orçamentos e no Início. O prazo de 5 dias protege a regra 3 no caso comum (a postada chega) e limita o custo do caso raro (5 dias de gasto pendente a mais, que já é o comportamento de qualquer pendente hoje).

**Onde mora:** a busca de pendentes com decisão, a busca de candidatas e as atualizações ficam em `TransactionsRepository` (sync); a escolha (menor distância, empate, uma por pendente, prazo) é uma função pura `matchVanishedPending` em `modules/sync/pending-replacement.ts`, com testes unitários. `deleteMissingPending` passa a receber os ids a manter (pendentes no prazo) e a nunca apagar uma pendente com decisão antes de a troca ser feita. Log: `{ accountId, carried, kept, ties }`, só contagens. As estatísticas de `sync_runs` não mudam, então a API e o front ficam como estão.

### 3. Apagar as pendentes antes das duplicatas (S3)

Em `saveTransactions`, por conta: `upsertMany` → troca e exclusão das pendentes que sumiram (decisão 2) → `markPossibleDuplicates(insertedIds)`. Tudo continua dentro do mesmo `unitOfWork.run`, então nada fica meio gravado. A detecção continua só para as linhas inseridas nesta execução e continua nunca juntando nada.

**Limite aceito:** se o usuário tinha resolvido "são diferentes" para a pendente e a manual, a postada que a substitui é marcada de novo, porque a marcação só existe na transação apagada. É uma pergunta a mais, nunca um dado juntado ou perdido.

### 4. Zerar investimentos só com coleta completa (S4)

**Campos do Pluggy** (tipos do `pluggy-sdk`, `dist/types/item.d.ts` e `execution.d.ts`):
- `status` do item: `UPDATED`, `UPDATING`, `MERGING`, `OUTDATED`, `LOGIN_ERROR`, `WAITING_USER_*`;
- `executionStatus`: `SUCCESS`, `PARTIAL_SUCCESS`, os `*_IN_PROGRESS` (inclusive `INVESTMENTS_IN_PROGRESS`) e os de erro;
- `statusDetail` (o SDK diz que só vem em `PARTIAL_SUCCESS`): `investments: { isUpdated: boolean, lastUpdatedAt } | null`, nulo quando o produto não foi pedido.

**Regra:** coleta completa = `status = 'UPDATED'` **e** (`executionStatus = 'SUCCESS'` **ou** (`executionStatus = 'PARTIAL_SUCCESS'` **e** `statusDetail.investments.isUpdated === true`)). Todo o resto é incompleto, inclusive `executionStatus` ausente ou desconhecido: na dúvida, não zerar. Função pura `investmentsCollectionOf(item)` em `item-status.ts`, devolvendo `'complete' | 'incomplete'`, chamada pelo `PluggyClient.getItem`, que passa o resultado em `PluggyItemOverview.investmentsCollection`. `pluggyItemSchema` ganha `statusDetail` (só `investments.isUpdated`, `nullish`).

**Gravação:** `upsertWithSnapshots` passa a só gravar e fotografar o que veio (inclusive os de saldo zero, como `TOTAL_WITHDRAWAL`). Um método separado, `zeroVanishedWithSnapshots(connectionId, returnedIds, date)`, faz o zerar com foto, e o `SyncService` só o chama com `investmentsCollection === 'complete'`. Dois métodos em vez de um parâmetro booleano.

**Dados reais:** as 55 posições zeradas em produção vieram com saldo zero e `status = TOTAL_WITHDRAWAL` do próprio Pluggy, ou seja, pelo upsert. Isso não depende da regra nova e continua igual (cenário "Resgate total informado pelo Pluggy").

**Fixtures:** as três têm `UPDATED`/`SUCCESS` e não têm `statusDetail`, então o comportamento delas não muda. Os testes novos mudam `status`, `executionStatus` e `statusDetail` do item na cópia da fixture (o `FakePluggySdk` aceita campos a mais). O `scripts/record-pluggy-fixtures.ts` passa a guardar `statusDetail` com só `isUpdated` e `lastUpdatedAt` de cada produto (sem `warnings`, que têm texto da instituição). As fixtures não são regravadas nesta change: o `.env` de desenvolvimento aponta para o sandbox.

**Alternativa descartada:** usar `lastUpdatedAt` do item contra a data de hoje. Não diz nada sobre o produto investimentos.

### 5. Recuperar a sincronização do dia e uma segunda tentativa (S5)

**Bancos pendentes do dia:** ids do `PLUGGY_ITEM_IDS` cuja conexão não existe ou não está arquivada e tem `last_synced_at` nulo ou de um dia anterior a hoje (São Paulo). Consulta nova `ConnectionsRepository.findSyncedOn(itemIds, today)` (ids sincronizados hoje); o `SyncService` calcula a diferença. Usar `last_synced_at` por banco, e não "existe execução `success` hoje", cobre também a execução `partial`: só o banco que falhou é lido de novo.

**Na subida** (`server.ts`, depois do `listen` e do `startSyncSchedule`): `recoverMissedSync({ pattern, sync, now })` em `sync.schedule.ts`. Se `cron.previousRuns(1, now)` (croner 11) cai hoje em São Paulo, chama `SyncService.catchUpToday()` sem `await` (a API atende enquanto isso) e registra falha de início só com o tipo do erro. `catchUpToday()` calcula os bancos pendentes; sem nenhum, não cria execução; com algum, `start('schedule', { itemIds })` e o lock existente decide (se ocupado, só o log "skipped", como `runScheduled`).

**Segunda tentativa:** `runScheduled()` (cron e recuperação) devolve quantos bancos ficaram pendentes depois da execução. Se houver, `sync.schedule.ts` agenda **um** `setTimeout` (com `unref`) de 3 horas (`SYNC_RETRY_DELAY_HOURS = 3`) que chama `catchUpToday()`, desde que a hora da tentativa ainda seja hoje em São Paulo. A tentativa não agenda outra. A execução manual não agenda tentativa: o usuário vê o resultado na hora.

**Por que entrou a segunda tentativa:** a foto de 31/12/2026 é a base dos bens e direitos no IR e só pode ser gravada naquele dia; uma falha passageira de um banco às 07:00 hoje custa a foto do dia inteiro. O custo é pequeno porque usa a mesma `catchUpToday()` da subida, sem configuração nova. Se a API reiniciar antes da tentativa, o timer some, mas a recuperação da subida faz o mesmo papel.

**Por que um timer relativo e não um segundo `SYNC_CRON`:** não cria variável de ambiente nova e fica sempre depois do horário configurado, qualquer que seja ele.

**Execução filtrada:** `syncAllItems` passa a receber a lista de ids da execução (todos, no cron e no botão; os pendentes, na recuperação e na tentativa). A foto das posições manuais e os alertas rodam em toda execução, como hoje (idempotentes).

**Integração com `harden-backups`:** aquela change manda o ping do healthchecks.io ao fim da sincronização agendada. A recuperação da subida e a segunda tentativa usam o mesmo caminho agendado (`trigger = 'schedule'`); quando as duas changes estiverem implementadas, elas **devem continuar disparando o mesmo ping**, com o resultado da execução que rodou. Quem implementar a segunda das duas confere isso com um teste.

### 6. Falhas isoladas também fora da gravação (S8)

- `syncAllItems` chama `syncItemSafely(itemId)`: um `try/catch` em volta de todo o `syncItem` (inclusive `connections.ensure`, `updateConnectionStatus` e o `updateStatus` de `recordFailure`). No `catch`: log com o tipo do erro e o estágio, tentativa de marcar a conexão como `error` só se ela já foi carregada (essa tentativa também em `try/catch`) e `FAILED_ITEM`.
- `execute` separa duas etapas: calcular o resultado (`syncAllItems`, fotos manuais, alertas), com o `catch` atual que vira `failed`; e gravar o resultado (`syncRuns.finish`), num `try/catch` próprio que só registra `sync run not closed` com o tipo do erro. A execução que ficou `running` porque o `finish` falhou é fechada por `failInterruptedRuns` na próxima subida, como já acontece quando o processo cai.

**Alternativa descartada:** repetir o `finish` com `failed`. Se o banco recusou o primeiro `finish`, o segundo tende a falhar igual, e quando funciona troca um resultado verdadeiro por um falso.

## Risks / Trade-offs

- **[Pendente com decisão fica até 5 dias quando a compra foi cancelada]** → o gasto conta nesse prazo, igual a qualquer pendente hoje; depois some sozinho.
- **[Postada de mesmo valor e data próxima que não é a mesma compra]** → exige mesma conta, mesmo valor, até 5 dias e chegada depois da pendente; empate não leva. O erro possível é uma categoria do usuário numa compra gêmea, nunca uma transação juntada ou apagada a mais.
- **[O Pluggy pode não mandar `executionStatus`/`statusDetail` como o SDK descreve]** → na dúvida não zera; o risco passa a ser uma posição resgatada sem `TOTAL_WITHDRAWAL` ficar com o saldo antigo. Conferir com dados reais (Questões em aberto).
- **[Janela grande depois de muito tempo parado consome a cota de histórico do Open Finance]** → quem consulta a instituição é o Meu Pluggy, não o Valora; o Valora só lê o que o Pluggy já tem.
- **[Banco com consentimento vencido gera uma tentativa extra por dia e uma execução a cada subida]** → só uma consulta do item ao Pluggy, que responde o mesmo status; aceito pela simplicidade.
- **[Recuperação na subida durante um deploy às 07:00]** → o lock impede duas execuções; quem chegar depois só registra que pulou.
- **[Testes de tempo]** → recuperação e segunda tentativa recebem `now` e o adiador por injeção, testados com relógio falso, sem esperar 3 horas.

## Migration Plan

Sem migration e sem mudança de API. O deploy normal (`infra/scripts/deploy.sh`) basta. A primeira subida depois do deploy já roda a recuperação se o horário do cron tiver passado e algum banco não tiver sincronizado no dia. Voltar a versão (`deploy.sh <ref>`) volta ao comportamento anterior sem limpar nada: as categorias levadas e os vínculos movidos são dados válidos.

## Open Questions

- **Valores reais de `executionStatus` e `statusDetail` no MeuPluggy (S4):** as fixtures do sandbox só mostram `UPDATED`/`SUCCESS`. A confirmar com dados reais: se um item MeuPluggy chega a `PARTIAL_SUCCESS`, se `statusDetail.investments` vem preenchido nesse caso e qual `executionStatus` aparece durante `UPDATING`. Até lá vale "na dúvida, não zerar".
- **Data da postada no cartão em relação à pendente (S2):** a tolerância de 1 dia antes e 5 depois é estimativa. A confirmar com as 2 pendentes categorizadas de produção quando virarem postadas (só contagem e diferença de dias, sem valores).
- **O Pluggy devolve transações do período em que o consentimento ficou vencido? (S1):** a janela maior só ajuda se o Meu Pluggy tiver coletado esse período ao renovar o mesmo item. Renovação como item novo é o S6, fora desta change.
- **Ping do `harden-backups` na recuperação e na segunda tentativa:** decidido que deve disparar (decisão 5); falta só conferir na implementação da segunda change.
