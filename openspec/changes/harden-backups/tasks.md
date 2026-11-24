## 1. Testes dos scripts: estrutura

- [x] 1.1 Criar `infra/scripts/tests/run-tests.sh` (roda cada `test-*.sh`, cada teste numa subshell com `mktemp -d` própria, resumo de passou/falhou e código de saída diferente de zero se algum falhar) e `infra/scripts/tests/assert.sh` (`assert_equals`, `assert_file_exists`, `assert_file_missing`, `assert_exit_code`, `assert_not_contains`), em bash puro, sem dependência nova (design, decisão 9)
- [x] 1.2 Criar os stubs em `infra/scripts/tests/stubs/`: `docker` (`pg_dump`, `psql` com contagens por tabela, `pg_restore` gravando o stdin), `curl` (grava os argumentos ou falha), `df` (percentuais fixos) e `date` (`STUB_NOW`/`STUB_TODAY`, o resto vai para o `date` real)
- [x] 1.3 Job `infra` em `.github/workflows/ci.yml`, no `ubuntu-latest`, rodando `bash infra/scripts/tests/run-tests.sh`

## 2. Nome do backup e sem sobrescrever (I1)

- [x] 2.1 Criar `infra/scripts/lib/backup-files.sh`: reconhece `valora-<origem>-AAAA-MM-DD_HHMMSS.dump` e o antigo `valora-AAAA-MM-DD.dump` (origem `weekly`, hora `000000`), devolve origem e chave de ordenação e ignora outros nomes (design, decisão 2)
- [x] 2.2 `backup.sh`: origem por argumento (`weekly`, `predeploy`, `manual`; padrão `manual`; outra é recusada com a lista das válidas), nome com origem, data e hora, `.tmp` com o nome completo, falha se o arquivo existir, `mv -n` e conferência de que o `.tmp` sumiu (decisão 1); `umask 077` e `chmod 600` no arquivo final; comentário do topo com a linha nova do cron
- [x] 2.3 `deploy.sh`: chamar `infra/scripts/backup.sh predeploy`
- [x] 2.4 Testes em `infra/scripts/tests/test-backup.sh`: `should_name_backup_with_origin_and_time_when_origin_is_weekly`, `should_use_manual_origin_when_no_argument_is_given`, `should_fail_without_dump_when_origin_is_unknown`, `should_keep_existing_file_when_name_is_already_taken`, `should_create_backup_with_mode_600_when_dump_succeeds`, `should_keep_all_backups_when_dump_fails`, `should_not_leave_tmp_file_when_dump_fails`

## 3. Retenção em camadas (I3)

- [x] 3.1 `backup.sh`: trocar `delete_expired_backups` pela retenção da decisão 3, com as constantes `WEEKLY_RETENTION_DAYS=56`, `MONTHLY_RETENTION_DAYS=365`, `SHORT_RETENTION_DAYS=30` e `ALWAYS_KEPT_PER_ORIGIN=3`, idade pela data do nome, rodando só depois de um backup bem-sucedido; cada apagado vai para o log só com o nome; funções curtas
- [x] 3.2 Testes em `infra/scripts/tests/test-retention.sh`, um por cenário da spec `home-server-deploy` ("Retenção dos backups"): semanal de 56 dias fica; semanal de 57 dias fora do primeiro do mês sai; primeiro do mês com 200 dias fica; primeiro do mês com 366 dias sai; antigo de 40 dias fica; pré-deploy de 31 dias sai quando há 3 mais novos; os 3 únicos pré-deploy vencidos ficam; manual de 31 dias sai; nome desconhecido de 400 dias fica

## 4. Restore-check (I5)

- [x] 4.1 `restore-check.sh`: `latest_backup` pela maior chave de `lib/backup-files.sh` (qualquer origem, contando os antigos); `CHECKED_TABLES` com `balance_snapshots`, `investment_snapshots` e `investments`
- [x] 4.2 Testes em `infra/scripts/tests/test-restore-check.sh`: `should_restore_newest_backup_when_origins_and_legacy_names_are_mixed`, `should_report_ok_when_all_six_tables_match`, `should_fail_and_name_table_when_investment_snapshots_diverge`, `should_fail_when_backup_dir_has_no_backup`, `should_drop_check_database_when_counts_diverge`

## 5. Avisos pelo healthchecks.io nos scripts (I4)

- [x] 5.1 Criar `infra/scripts/lib/healthcheck.sh`: `healthcheck_url <NOME>` (variável de ambiente ou só a linha do `infra/.env`, nunca `source`; `VALORA_ENV_FILE` troca o caminho; valor sem `https://` é ignorado com log) e `ping_healthcheck <url> <código>` (`curl -fsS --max-time 10 --retry 2`, sem corpo; falha vira linha de aviso e retorno 0; nunca imprime a URL) (decisão 5)
- [x] 5.2 Criar `infra/scripts/weekly-backup.sh`: `backup.sh weekly`, `restore-check.sh` só se o backup deu certo, aviso em `HEALTHCHECK_BACKUP_URL` com o código de saída, e sai com o código do trabalho (decisão 4)
- [x] 5.3 Criar `infra/scripts/disk-check.sh`: `df -P` de `/` e do `BACKUP_DIR`, `DISK_USAGE_LIMIT_PERCENT=85`, aviso em `HEALTHCHECK_DISK_URL` com `0` ou `1`, log só com caminho e percentual (decisão 7)
- [x] 5.4 Testes em `infra/scripts/tests/test-weekly-backup.sh`: `should_ping_zero_when_backup_and_restore_check_pass`, `should_ping_failure_and_skip_restore_check_when_backup_fails`, `should_ping_failure_when_restore_check_diverges`, `should_send_nothing_when_url_is_empty`, `should_read_url_from_env_file_when_variable_is_not_set`, `should_ignore_url_when_it_is_not_https`, `should_keep_backup_exit_code_when_ping_fails`, `should_never_print_ping_url_in_log`
- [x] 5.5 Testes em `infra/scripts/tests/test-disk-check.sh`: `should_ping_zero_when_usage_is_below_limit`, `should_ping_zero_when_usage_is_exactly_85`, `should_ping_failure_and_name_path_when_backup_disk_is_at_86`, `should_send_nothing_when_url_is_empty`

## 6. Backend: aviso da sincronização agendada (I4)

- [x] 6.1 `shared/config.ts`: `HEALTHCHECK_SYNC_URL` opcional (vazia ou ausente → `null`; preenchida → `z.url()` só `https`), `Config.healthcheckSyncUrl: string | null`; testes em `test/shared/config.test.ts`: ausente, vazia, `https` válida e `http` recusada citando só o nome da variável
- [x] 6.2 `SyncService`: `execute` resolve o status final (`failed` no erro inesperado), `StartSyncResult.finished: Promise<SyncRunStatus>` e `runScheduled(): Promise<ScheduledSyncResult>` (`'skipped'` quando já há uma rodando); ajustar o `sync-harness.ts` e os testes que dependem do tipo
- [x] 6.3 Criar `modules/sync/healthcheck-pinger.ts` (`HealthcheckPinger.report('success' | 'fail')`, `PING_TIMEOUT_MS = 5_000`, `fetch` e `timeoutMs` injetados, nunca rejeita, log com `errorType` ou `statusCode` e sem a URL) (decisão 6)
- [x] 6.4 Testes Vitest do pinger, com `fetch` falso injetado: `should_call_url_when_result_is_success`, `should_call_fail_suffix_when_result_is_fail`, `should_not_call_fetch_when_url_is_null`, `should_resolve_and_log_error_type_when_fetch_rejects`, `should_resolve_and_log_timeout_when_server_does_not_answer` (com `timeoutMs` pequeno), `should_log_status_code_when_response_is_not_ok`, `should_never_log_url`
- [x] 6.5 `sync.schedule.ts`: `heartbeat` nas opções, função pura `heartbeatFor(result)` (`success` → `success`; `partial`/`failed` → `fail`; `skipped` → nenhum) e aviso `fail` quando `runScheduled()` rejeita, repassando o erro; `server.ts` cria o pinger com `globalThis.fetch` e a URL da config
- [x] 6.6 Testes em `test/modules/sync/sync.schedule.test.ts` (disparando o job com `trigger()`): um por resultado (`success`, `partial`, `failed`, `skipped`) e `should_report_fail_and_rethrow_when_scheduled_sync_cannot_start`; teste de integração: sincronização pelo botão não chama o pinger

## 7. Logs (I8)

- [x] 7.1 `infra/compose.yml`: âncora `x-logging` (`json-file`, `max-size: 10m`, `max-file: "5"`) nos três serviços; conferir com `docker compose -f infra/compose.yml config`
- [x] 7.2 `shared/request-log.ts`: não registrar `GET` no caminho do health (constante exportada pelo módulo de health) quando o status é 200
- [x] 7.3 Testes em `test/api/logging.test.ts`: `should_not_log_health_when_status_is_200`, `should_log_health_when_status_is_503`, `should_log_other_routes_when_status_is_200`

## 8. Variáveis e qualidade

- [x] 8.1 `infra/.env.example`: `HEALTHCHECK_BACKUP_URL=`, `HEALTHCHECK_SYNC_URL=` e `HEALTHCHECK_DISK_URL=` vazias, com comentário (opcionais, só `https`, a URL é segredo, nada é enviado sem ela); `backend/.env.example`: `HEALTHCHECK_SYNC_URL=` vazia, com a mesma nota
- [x] 8.2 Rodar `bash infra/scripts/tests/run-tests.sh` (Linux ou WSL) e, no `backend/`, `npm run typecheck`, `npm run lint`, `npm run format:check` e `npm test` (os de integração com o Docker rodando)

## 9. No servidor (manual, depois do deploy)

- [ ] 9.1 No healthchecks.io, criar três checks no fuso `America/Sao_Paulo`: "Valora backup semanal" (cron `0 3 * * 0`, tolerância 2 h), "Valora sincronização" (cron `0 7 * * *`, tolerância 1 h) e "Valora disco" (cron `0 6 * * *`, tolerância 1 h), com o aviso por e-mail
- [ ] 9.2 Preencher `HEALTHCHECK_BACKUP_URL`, `HEALTHCHECK_SYNC_URL` e `HEALTHCHECK_DISK_URL` no `~/Valora/infra/.env` e reiniciar o backend (`docker compose -f infra/compose.yml up -d backend`) para ele ler a URL
- [ ] 9.3 `crontab -e`: trocar a linha do `backup.sh` por `0 3 * * 0 /home/luccas-philot/Valora/infra/scripts/weekly-backup.sh >> /var/log/valora-backup.log 2>&1` e incluir `0 6 * * * /home/luccas-philot/Valora/infra/scripts/disk-check.sh >> /var/log/valora-backup.log 2>&1`
- [ ] 9.4 Permissões: `chmod 700 /mnt/hdd/valora` e `chmod 600 /mnt/hdd/valora/*.dump`
- [ ] 9.5 Rodar `~/Valora/infra/scripts/weekly-backup.sh` e `~/Valora/infra/scripts/disk-check.sh` uma vez; conferir no log o arquivo `valora-weekly-…`, o restore-check com as seis tabelas, e os dois checks verdes no painel; conferir que o log não tem a URL
- [ ] 9.6 No dia seguinte, depois das 07:00, conferir que o check "Valora sincronização" recebeu o sinal (o aviso só sai da sincronização agendada, não do botão)
- [ ] 9.7 Conferir a rotação: `docker inspect --format '{{.HostConfig.LogConfig}}' valora-backend-1` mostra `max-size` e `max-file`, e `docker compose -f infra/compose.yml logs backend` não tem mais as linhas do health

## 10. Documentação

- [x] 10.1 `docs/05-deploy.md`, seção Backup: nomes por origem, nunca sobrescrever, retenção em camadas, `chmod 600`, `weekly-backup.sh` no cron com o restore-check, a linha do disco; cópia fora de casa **não implementada**, com o risco aceito (roubo, incêndio, ransomware) e que fica para depois
- [x] 10.2 `docs/05-deploy.md`, "Restaurar": backup `manual` → `compose stop backend` → `pg_restore --clean --if-exists` → `compose start backend`, e como escolher o arquivo (num rollback, o `predeploy` de antes do deploy ruim, não o mais recente)
- [x] 10.3 `docs/05-deploy.md`: seção nova "Avisos de falha" (os três checks, o que é enviado e o que não é, a URL como segredo, o que fazer quando um aviso chega), as três variáveis na tabela "Variáveis de ambiente", rotação de logs e o health fora do log em "Saúde"
- [x] 10.4 `docs/03-arquitetura.md`: linha "Avisos de falha pelo healthchecks.io" na tabela "Decisões" (sinal de ok/falha sem dados, opcional, dead-man's switch, nunca derruba o monitorado, o agendamento avisa e o `SyncService` não sabe), seção curta "Segurança" (entra só pela Tailscale; saem só as chamadas ao Pluggy e o sinal do healthchecks.io; logs sem dados; dumps `600`) e o diagrama da visão geral com a seta do aviso
- [x] 10.5 `infra/README.md`: os scripts novos (`weekly-backup.sh`, `disk-check.sh`, `lib/`, `tests/`), a retenção nova e como rodar os testes
- [x] 10.6 `CLAUDE.md`, seção Comandos: `backup.sh [weekly|predeploy|manual]` com a retenção em camadas, `weekly-backup.sh`, `disk-check.sh` e `bash infra/scripts/tests/run-tests.sh`; o job `infra` do CI na frase sobre o CI
- [ ] 10.7 Ao arquivar: em `docs/07-roadmap.md`, atualizar o item "Backup semanal (domingo) com retenção de 30 dias" para a retenção em camadas e incluir, marcado `[x]`, "Avisos de falha do backup, da sincronização e do disco pelo healthchecks.io"; em `docs/08-revisao-e-proximas-fases.md`, marcar I1, I3, I4, I5 e I8 como resolvidos (I3 com a cópia off-site pendente) e a linha `harden-backups` da ordem sugerida como feita
