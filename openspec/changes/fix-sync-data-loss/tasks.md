## 1. Janela a partir da última sincronização (S1)

- [ ] 1.1 Testes unitários primeiro (`test/modules/sync/transaction-window.test.ts`) para `transactionWindowFor(lastSyncedAt, now)`: nunca sincronizado (365), sincronizado ontem (30), parado 10 dias (30), parado 70 dias (dia da última − 7), parado 400 dias (365), `last_synced_at` às 23:30 em São Paulo (dia certo no fuso)
- [ ] 1.2 Criar `modules/sync/transaction-window.ts` com as constantes `FIRST_SYNC_DAYS`, `MIN_SYNC_DAYS` e `RESUME_MARGIN_DAYS` (design, decisão 1) e fazer `SyncService.windowFor` usá-la
- [ ] 1.3 Testes de integração em `sync.test.ts`: `should_fetch_since_last_sync_when_bank_was_down_for_more_than_30_days` (consentimento vencido por 70 dias, depois volta) e `should_fetch_since_last_sync_when_bank_is_reactivated_after_months` (em `sync-archived.test.ts`); o teste atual dos 30 dias continua passando

## 2. Pendente que vira postada leva a decisão do usuário (S2)

- [ ] 2.1 Testes unitários primeiro (`test/modules/sync/pending-replacement.test.ts`) para `matchVanishedPending`: uma candidata, nenhuma, duas na mesma distância (empate, não leva), duas em distâncias diferentes (a mais próxima), 1 dia antes e 5 depois (fronteiras dentro), 2 antes e 6 depois (fora), uma postada não serve a duas pendentes, prazo de 5 dias (manter no dia 5, apagar no dia 6)
- [ ] 2.2 Criar `modules/sync/pending-replacement.ts` com a função pura e as constantes `PENDING_MATCH_DAYS_BEFORE`, `PENDING_MATCH_DAYS_AFTER` e `PENDING_GRACE_DAYS` (design, decisão 2)
- [ ] 2.3 `TransactionsRepository` (sync): buscar as pendentes que sumiram com decisão do usuário (`category_source = 'user'` ou ocorrência vinculada) e as postadas candidatas da conta numa consulta só; levar a categoria (sem mexer em postada já `user`); mover o vínculo de `planned_entry_occurrences` quando a postada não realiza outra ocorrência; `deleteMissingPending` passa a receber os ids das pendentes que ficam no prazo
- [ ] 2.4 `saveTransactions` em `sync.service.ts`: chamar a troca antes de apagar, com log só de contagens (`carried`, `kept`, `ties`)
- [ ] 2.5 Testes de integração (novo `test/integration/sync-pending-replacement.test.ts`, fixtures gravadas ajustadas no teste): `should_carry_user_category_to_posted_when_pending_is_replaced_by_another_id`, `should_move_planned_entry_link_to_posted_when_pending_is_replaced`, `should_keep_posted_user_category_when_it_already_has_one`, `should_keep_pending_and_carry_nothing_when_two_candidates_tie`, `should_choose_the_closest_date_when_two_candidates_differ`, `should_keep_categorized_pending_when_no_candidate_within_5_days`, `should_carry_category_when_posted_arrives_after_pending_vanished`, `should_delete_categorized_pending_when_no_candidate_after_5_days`, `should_delete_pending_without_user_decision_right_away`, `should_not_touch_manual_transactions_when_replacing_pending`
- [ ] 2.6 Conferir que levar a categoria não cria regra aprendida (`category_rules`) e que o `Categorizer` não sobrescreve a categoria levada, com um teste de integração

## 3. Duplicata conferida depois de apagar as pendentes (S3)

- [ ] 3.1 Teste de integração primeiro em `possible-duplicates.test.ts`: `should_mark_posted_as_possible_duplicate_when_it_replaces_a_pending_with_another_id` (a pendente marcada some, a postada chega, a manual e a postada ficam, com a marcação)
- [ ] 3.2 Reordenar `saveTransactions`: upsert → troca e exclusão das pendentes → `markPossibleDuplicates(insertedIds)`, tudo no mesmo `unitOfWork.run`; os testes de duplicata existentes continuam passando

## 4. Investimentos só zerados com coleta completa (S4)

- [ ] 4.1 Testes unitários primeiro em `test/modules/sync/item-status.test.ts` para `investmentsCollectionOf`: `UPDATED` + `SUCCESS` (completa), `PARTIAL_SUCCESS` com `investments.isUpdated` verdadeiro (completa) e falso (incompleta), `statusDetail` nulo ou `investments` nulo em `PARTIAL_SUCCESS` (incompleta), `UPDATING` com `INVESTMENTS_IN_PROGRESS` (incompleta), `executionStatus` ausente ou desconhecido (incompleta)
- [ ] 4.2 `pluggy.schemas.ts`: `statusDetail` com `investments.isUpdated` (`nullish`); `item-status.ts`: `investmentsCollectionOf`; `pluggy-client.ts`: `PluggyItemOverview.investmentsCollection`, com teste em `pluggy-client.test.ts`
- [ ] 4.3 `InvestmentsRepository`: separar `upsertWithSnapshots` (só o que veio) de `zeroVanishedWithSnapshots`; `saveItemData` chama o segundo só com coleta completa
- [ ] 4.4 Testes de integração em `investments-sync.test.ts`: `should_not_zero_vanished_positions_when_investments_collection_is_partial`, `should_not_zero_vanished_positions_when_item_is_updating`, `should_zero_vanished_positions_when_partial_success_collected_investments`, `should_save_zero_snapshot_when_pluggy_returns_total_withdrawal_during_partial_collection`; os testes atuais de "sumiu = zerado" continuam passando com as fixtures `UPDATED`/`SUCCESS`
- [ ] 4.5 `scripts/record-pluggy-fixtures.ts`: guardar `statusDetail` do item só com `isUpdated` e `lastUpdatedAt` de cada produto (sem `warnings`); não regravar as fixtures nesta change

## 5. Recuperar a sincronização do dia e segunda tentativa (S5)

- [ ] 5.1 `ConnectionsRepository.findSyncedOn(itemIds, today)` com teste de integração (dia em São Paulo, banco arquivado fora)
- [ ] 5.2 Testes primeiro para `SyncService.catchUpToday()` em `test/integration/sync-catch-up.test.ts`: `should_sync_every_active_bank_when_api_starts_without_sync_today`, `should_sync_only_banks_without_success_today_when_last_run_was_partial`, `should_not_create_a_run_when_every_bank_synced_today`, `should_skip_without_a_new_run_when_another_sync_is_running`, `should_record_schedule_as_trigger_when_catching_up`
- [ ] 5.3 `SyncService`: `start(trigger, { itemIds })`, `syncAllItems` com a lista da execução, `catchUpToday()`, e `runScheduled()` devolvendo quantos bancos ficaram pendentes
- [ ] 5.4 Testes unitários primeiro em `sync.schedule.test.ts` (relógio e adiador falsos): recuperação depois do horário do `SYNC_CRON`, nada antes do horário, segunda tentativa 3 horas depois só com banco pendente, nenhuma segunda tentativa a partir da tentativa, nenhuma que passe da meia-noite em São Paulo, nenhuma depois de execução manual
- [ ] 5.5 `sync.schedule.ts`: `recoverMissedSync` (com `previousRuns`) e a segunda tentativa com `setTimeout` + `unref` (`SYNC_RETRY_DELAY_HOURS`); `server.ts` chama a recuperação depois do `listen`, sem `await` no fim da sincronização e com log só do tipo do erro
- [ ] 5.6 Se a change `harden-backups` já estiver implementada, garantir com um teste que a recuperação e a segunda tentativa disparam o mesmo ping da sincronização agendada; se não estiver, deixar a dependência anotada no design daquela change (design, decisão 5)

## 6. Falhas isoladas também fora da gravação (S8)

- [ ] 6.1 Testes de integração primeiro em `sync.test.ts` (repositório de conexões que falha num item, por injeção): `should_sync_following_banks_when_database_fails_while_ensuring_a_connection`, `should_sync_following_banks_when_database_fails_while_updating_connection_status`, `should_keep_real_stats_when_only_finishing_the_run_fails`
- [ ] 6.2 `sync.service.ts`: `syncItemSafely` em volta de todo o `syncItem`; `execute` com o cálculo do resultado e o `syncRuns.finish` em `try/catch` separados; log só com o tipo do erro

## 7. Conferência

- [ ] 7.1 Rodar no `backend/` `npm run typecheck`, `npm run lint`, `npm run format:check` e `npm test` (com Docker), sem falhas novas; conferir que nenhum log novo leva valores ou descrições (`should_not_log_values_descriptions_or_credentials_when_a_sync_runs` continua passando)

## 8. Documentação e roadmap

- [ ] 8.1 `docs/02-open-finance.md`: a janela a partir da última sincronização e o que o Valora faz quando a coleta de investimentos do Pluggy é parcial
- [ ] 8.2 `docs/03-arquitetura.md`, seção "Sincronização": passo 3 (janela, pendente com decisão do usuário, ordem pendentes → duplicatas), passo 5, passo 6 (zerar só com coleta completa), recuperação na subida e segunda tentativa, isolamento por banco
- [ ] 8.3 `docs/03-arquitetura.md`, tabela "Decisões": atualizar "Investimento que sumiu da resposta é zerado"; novas linhas para janela a partir da última sincronização, decisão do usuário levada da pendente para a postada, recuperação na subida com segunda tentativa por timer
- [ ] 8.4 `docs/04-modelo-de-dados.md`: "Posição que sumiu = posição zerada" só com coleta completa; nota em `planned_entry_occurrences` sobre o vínculo levado da pendente para a postada (sem coluna nova)
- [ ] 8.5 Ao arquivar: marcar S1, S2, S3, S4, S5 e S8 como resolvidos em `docs/08-revisao-e-proximas-fases.md` (tabela da Parte 1, resumo e linha 2 da "Ordem sugerida"), registrando que a parte de tela da "Foto de 31/12 garantida" continua na Fase 4
