## 1. Verificação de carga no backend

- [x] 1.1 Testes primeiro em `backend/test/shared/boot-check.test.ts` (pastas temporárias): `should_report_module_when_import_throws`, `should_report_config_variables_when_env_is_invalid`, `should_return_no_problems_when_everything_loads`, `should_skip_server_entry_when_scanning`
- [x] 1.2 `backend/src/shared/boot-check.ts` com `runBootCheck({ distDirectory, env })`: varre os `.js`, importa cada um (menos `server.js` e `boot-check.js`), chama `loadConfig` e devolve os problemas, sem valores de variáveis
- [x] 1.3 `backend/src/boot-check.ts` (entrada): imprime os problemas e sai com 1, ou "ok" e sai com 0; conferir que o `tsc` gera `dist/boot-check.js`
- [x] 1.4 Conferir à mão: com o import antigo do `web-push`, `node dist/boot-check.js` falha apontando `web-push-sender.js`; com o conserto, passa

## 2. Smoke test no `deploy.sh`

- [x] 2.1 Testes primeiro em `infra/scripts/tests/` (com o `docker` falso): `should_not_run_up_when_backend_boot_check_fails`, `should_not_run_up_when_nginx_test_fails`, `should_run_up_without_build_when_smoke_test_passes`, `should_say_old_containers_keep_running_when_smoke_test_fails`
- [x] 2.2 `deploy.sh`: `compose build`, nova função `smoke_test_images` (`compose run --rm --no-deps backend node dist/boot-check.js` e `frontend nginx -t`) e `start_stack` sem `--build`; mensagem de erro com o estado (versão anterior no ar, clone no commit novo, como voltar)
- [x] 2.3 Conferir num Compose local que o `nginx -t` roda na imagem `nginx-unprivileged` sem o backend no ar (senão, `-g 'pid /tmp/nginx.pid;'`) e que a primeira subida (sem containers) também passa pelo smoke test

## 3. Job de boot no CI

- [x] 3.1 Job `docker-boot` em `.github/workflows/ci.yml`: `infra/.env` falso (senha aleatória do passo), `up -d --build --wait --wait-timeout 180`, `curl` do `/api/v1/health` em `127.0.0.1:3000`, logs se falhar e `down -v` em `if: always()`
- [x] 3.2 Conferir que o `croner` aceita o `SYNC_CRON` escolhido (`0 0 30 2 *`; senão, `0 0 29 2 *`) e que o backend não chama o Pluggy ao subir com ele
- [x] 3.3 Provar que o job acusa o problema: reintroduzir o `import webpush from 'web-push'` e ver `up --wait` falhar (feito localmente, numa cópia descartável do repositório, sem push)

## 4. Conferência

- [x] 4.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e `bash infra/scripts/tests/run-tests.sh` (Linux ou WSL); conferir `git ls-files --eol | grep -E "w/(crlf|mixed)"` sem saída

## 5. Documentação

- [x] 5.1 `docs/05-deploy.md`: passo novo em "Atualizar o app" (build, smoke test, só então a troca) e uma nota "o deploy falhou no smoke test: o que fazer" (versão antiga continua no ar; clone no commit novo; `deploy.sh <ref anterior>`)
- [x] 5.2 `docs/03-arquitetura.md`, tabela "Decisões": o deploy testa a imagem antes de trocar os containers e o CI sobe a stack
- [x] 5.3 `docs/08-revisao-e-proximas-fases.md`: registrar que o I14 (CI sem build nem execução das imagens) ficou coberto aqui na parte de subir a stack; ao arquivar, avisar na `harden-infra` que o B.2 (`docker build` solto) ficou redundante
