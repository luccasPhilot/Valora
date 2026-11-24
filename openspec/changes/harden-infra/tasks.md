Os grupos são independentes e podem ir a produção um por vez. Ordem recomendada: E → D → A → B → F → C (design, decisão 1).

## E. Backend: outro site e desligamento (I11, I12)

- [ ] E.1 Testes primeiro (`app.inject()`): `should_reject_post_when_sec_fetch_site_is_cross_site`, `should_accept_post_when_sec_fetch_site_is_same_origin`, `should_accept_post_without_sec_fetch_site`, `should_accept_get_when_cross_site`
- [ ] E.2 `shared/cross-site-guard.ts` registrado no app, com o erro no formato padrão
- [ ] E.3 Testes primeiro para o desligamento (relógio e sincronização falsos): para o cron e a segunda tentativa, espera a execução em curso, sai depois de 60 s se ela não terminar, roda uma vez só com dois sinais
- [ ] E.4 `sync.schedule.ts` devolve um `stop()`; `SyncService` expõe a execução em curso; `server.ts` trata SIGTERM e SIGINT; `init: true` e `stop_grace_period: 75s` no Compose

## D. nginx (I10)

- [ ] D.1 `frontend/security-headers.conf` (design, decisão 5), incluído no `server` e em cada `location`; `server_tokens off`
- [ ] D.2 Subir o Compose local, conferir com `curl -I` que `/`, `/assets/…`, `/sw.js`, `/manifest.webmanifest` e `/api/v1/health` levam os headers, e percorrer todas as telas sem violação de CSP no console (inclusive gráficos e instalação da PWA)

## A. Imagens e deploy (I6, I13)

- [ ] A.1 Digest nas imagens base dos dois Dockerfiles, do `compose.yml`, do `compose.dev.yml` e do Testcontainers do backend
- [ ] A.2 Testes primeiro em `infra/scripts/tests/`: pula o build quando as imagens da versão existem; guarda 3 versões; a limpeza filtra pelo projeto `valora`; `pull` do `db` antes do `up`
- [ ] A.3 `deploy.sh`: `VALORA_IMAGE_TAG`, `pull`, build com `--pull` só quando falta a imagem, limpeza filtrada; `compose.yml` com `image:` por versão

## B. GitHub (I7, I14)

- [ ] B.1 `.github/dependabot.yml` (npm do backend e do frontend, docker, github-actions; semanal; agrupado)
- [ ] B.2 `ci.yml`: `npm audit --omit=dev --audit-level=high` nas duas partes; job de `docker build` sem push; actions por SHA (também no `release.yml`)
- [ ] B.3 Conferir a proteção da `main` no GitHub e documentar em `docs/05-deploy.md` o que deve estar ligado (CI verde obrigatório); quem liga é o usuário

## F. Memória e PostgreSQL (I15)

- [ ] F.1 Medir com `docker stats` no servidor por um dia de uso normal e anotar os picos
- [ ] F.2 `mem_limit` por serviço com pelo menos 2× o pico; `docs/05-deploy.md` com "Atualizar o PostgreSQL (versão maior)"

## C. Banco sem superusuário (I9)

- [ ] C.1 `infra/scripts/create-app-role.sh` (idempotente, só no banco `valora`, confere os donos no fim) e `infra/db-init/01-app-role.sh` para instalação nova, com testes de shell
- [ ] C.2 Teste de integração do backend: com `valora_app`, as migrations rodam, e `COPY … TO PROGRAM` e `CREATE DATABASE` são recusados
- [ ] C.3 `DATABASE_URL` do backend com `valora_app` e `POSTGRES_APP_PASSWORD` em `infra/.env.example`; `restore-check.sh` confere o dono das tabelas restauradas
- [ ] C.4 Passo a passo no servidor em `docs/05-deploy.md`: backup manual, `create-app-role.sh`, senha no `.env`, deploy, e como voltar

## Conferência

- [ ] Z.1 Rodar `typecheck`, `lint`, `format:check` e `test` no `backend/` e no `frontend/`, e `bash infra/scripts/tests/run-tests.sh` (Linux ou WSL)

## Documentação

- [ ] Z.2 `docs/05-deploy.md` (deploy com versões, papel do banco, headers, ACL da tailnet, Portainer e Dozzle a conferir, PostgreSQL), `docs/03-arquitetura.md` (segurança e Decisões: digest, papel do banco, guarda de outro site) e `CLAUDE.md` (Comandos: `create-app-role.sh`)
- [ ] Z.3 Ao arquivar: marcar I6, I7, I9, I10, I11, I12, I13, I14 e I15 como resolvidos em `docs/08-revisao-e-proximas-fases.md`
