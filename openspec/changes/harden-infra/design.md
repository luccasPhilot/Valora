## Context

- `infra/compose.yml`: `db` (`postgres:18-alpine`), `backend` e `frontend` construídos das pastas, rotação de logs, só o `frontend` publica porta em `127.0.0.1:3000`. Usuário do banco `valora` (superusuário, criado pela imagem).
- `deploy.sh`: confere o checkout limpo, faz backup `predeploy`, troca de versão, `compose up -d --build --wait`, e `docker image prune --force` + `docker builder prune` (globais).
- Dockerfiles: `node:${NODE_VERSION}-alpine` e `nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine`, por tag. Rodam sem root.
- `server.ts`: `listen`, cron e recuperação; nenhum handler de sinal. O `Cron` e o adiador da segunda tentativa (`setTimeout` com `unref`) estão em `sync.schedule.ts`.
- CI: `actions/checkout@v7` e `actions/setup-node@v7` por tag; jobs do backend, frontend e infra; nenhum build de imagem.
- O servidor de casa roda outros apps (Portainer, Dozzle e mais), e é acessado só pela Tailscale.

## Goals / Non-Goals

**Goals:**
- Correções de segurança das imagens base chegam a cada deploy, de forma reprodutível.
- O processo do backend não consegue sair do próprio banco nem rodar comandos no servidor pelo PostgreSQL.
- Um deploy não mata uma sincronização no meio nem apaga imagens dos outros apps.
- Voltar versão é rápido.

**Non-Goals:**
- Backup fora de casa, login, exposição fora da Tailscale.
- Configurar a tailnet, o Portainer ou o Dozzle (são do usuário).

## Decisions

### 1. Grupos independentes

As tarefas vêm em seis grupos, cada um testável e publicável sozinho: (A) imagens e deploy, (B) GitHub, (C) papel do banco, (D) nginx, (E) backend (outro site e desligamento), (F) memória e documentação do PostgreSQL. A ordem recomendada é E → D → A → B → F → C, do menor risco ao maior; C mexe no banco de produção e vem por último, com backup manual antes.

### 2. Digest e `pull` (I6)

- `FROM node:26-alpine@sha256:…`, `nginxinc/nginx-unprivileged:…@sha256:…` e `postgres:18-alpine@sha256:…`, com a tag mantida para leitura. O Dependabot (ecossistema `docker`) abre PR quando o digest muda.
- O deploy roda `compose pull db` antes do `up`, e o `up` usa `--build --pull always` só para o build (as imagens base do Node e do nginx). A mesma versão do PostgreSQL continua em `compose.dev.yml` e nos testes (Testcontainers), agora pelo digest.

### 3. Imagens por versão e limpeza filtrada (I13)

- `image: valora-backend:${VALORA_IMAGE_TAG:-dev}` e `valora-frontend:${VALORA_IMAGE_TAG:-dev}`; o deploy exporta `VALORA_IMAGE_TAG=<sha curto>`.
- Se as duas imagens do `sha` pedido já existem, o deploy pula o build (`up --no-build`): volta de versão em segundos.
- Limpeza: lista as imagens `valora-backend` e `valora-frontend` por data e apaga as que passam das 3 mais recentes, fora a que está no ar; `docker builder prune` e `image prune` com `--filter label=com.docker.compose.project=valora`. Nada global.
- Testado nos testes de shell de `infra/scripts/tests/` com o `docker` falso que eles já usam.

### 4. Papel `valora_app` (I9)

- `valora_app`: `LOGIN`, sem `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` nem `BYPASSRLS`; dono do banco `valora` e do schema `public` e de todas as tabelas e sequências (as migrations do Drizzle rodam com ele, então precisa ser dono).
- `infra/scripts/create-app-role.sh` (uma vez, no servidor): roda dentro do container `db` com o usuário `valora`, cria o papel com a senha `POSTGRES_APP_PASSWORD` do `infra/.env`, faz `ALTER DATABASE … OWNER`, `REASSIGN OWNED BY valora TO valora_app` no banco `valora` e confere que nenhuma tabela ficou com outro dono. É idempotente.
- Instalação nova: `infra/db-init/01-app-role.sh` montado em `/docker-entrypoint-initdb.d`, fazendo o mesmo.
- `DATABASE_URL` do backend passa a `postgres://valora_app:${POSTGRES_APP_PASSWORD}@db:5432/valora`. `backup.sh` e `restore-check.sh` continuam com `valora`, e o restore-check confere que o dono das tabelas restauradas é `valora_app` (o `pg_dump` grava o dono).
- **Ordem no servidor:** backup manual → `create-app-role.sh` → `POSTGRES_APP_PASSWORD` no `.env` → deploy da versão nova. Para voltar: `DATABASE_URL` antiga funciona sempre, porque `valora` continua superusuário.
- **Alternativa descartada:** papel só com `SELECT/INSERT/UPDATE/DELETE` e um segundo papel para migrations. Mais seguro, mas exigiria duas conexões e mudar o fluxo das migrations na subida; para um app pessoal, tirar o superusuário já fecha o risco grande (`COPY … TO PROGRAM`, `DROP DATABASE` de outros bancos).

### 5. Headers no nginx (I10)

- `frontend/security-headers.conf` com `add_header … always` e incluído em cada `location` e no `server`.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. O `'unsafe-inline'` em `style-src` é para os estilos inline do Recharts e do Radix; scripts continuam sem inline. A validação é abrir todas as telas com o console aberto, sem violação, antes do deploy.
- `server_tokens off`.

### 6. Outro site (I11)

- Plugin `onRequest` em `shared/cross-site-guard.ts`: se o método não é `GET`, `HEAD` ou `OPTIONS` e `sec-fetch-site` é `cross-site`, responde 403 com `{ error: { code: 'CROSS_SITE_REQUEST', … } }`. `same-origin`, `same-site`, `none` e ausente passam (o front, o curl e o teste local).
- Por que não token CSRF: um usuário, sem sessão nem cookie; o header que todo navegador atual manda resolve sem estado.
- Documentação: em `docs/05-deploy.md`, uma ACL mínima da tailnet (só os aparelhos do usuário acessam a porta do servidor) e conferir se o Portainer e o Dozzle estão presos ao `127.0.0.1` ou atrás da Tailscale.

### 7. Desligamento gracioso (I12)

- `init: true` no `backend` (e no `frontend`, por coerência): o `tini` repassa o SIGTERM ao Node.
- `server.ts`: em SIGTERM/SIGINT, uma vez: para o `Cron` e o adiador da segunda tentativa (o `sync.schedule.ts` passa a devolver um `stop()`), espera a sincronização em curso (o `SyncService` expõe a promessa da execução atual) por até 60 s, chama `app.close()` e fecha o pool. Passou de 60 s, sai assim mesmo: o lock é solto pelo PostgreSQL e `failInterruptedRuns` fecha a execução na subida seguinte.
- `stop_grace_period: 75s` no `backend`.

### 8. Memória e PostgreSQL (I15)

- `mem_limit`: começo com db 1 GB, backend 512 MB, frontend 128 MB. Antes do deploy, `docker stats` no servidor por um dia de uso normal; o limite fica com pelo menos 2× o pico observado.
- `docs/05-deploy.md` ganha "Atualizar o PostgreSQL (versão maior)": backup manual, volume novo, subir a versão nova vazia, `pg_restore`, `restore-check.sh`, trocar o volume no Compose e como voltar.

## Risks / Trade-offs

- **CSP quebra alguma tela:** a validação é manual, tela a tela. → Se algo quebrar em produção, o deploy volta com `deploy.sh <ref anterior>`, agora sem rebuild.
- **`REASSIGN OWNED` no banco errado:** o script trava se o banco atual não for `valora` e confere os donos no fim. → Backup manual antes, obrigatório na tarefa.
- **Digest velho:** sem PR do Dependabot aceito, o digest para no tempo. → O PR semanal agrupado avisa; aceitar é decisão do usuário.

## Migration Plan

Cada grupo vai a produção sozinho, pelo `deploy.sh`. O grupo C (papel do banco) tem o passo extra no servidor descrito na decisão 4.

## Open Questions

- O Portainer e o Dozzle estão presos ao `127.0.0.1` ou abertos na tailnet? (a conferir no servidor)
- Quanto de memória cada serviço usa num dia normal? (a medir antes de fixar `mem_limit`)
