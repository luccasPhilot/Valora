## Why

A revisão de 18/11/2026 (`docs/08-revisao-e-proximas-fases.md`) deixou riscos de infra e segurança que não perdem dado hoje, mas abrem caminho para isso. A `harden-backups` cuidou do backup, dos avisos e da rotação de logs; o resto fica aqui:

- **I6, Média:** as imagens base nunca recebem correções. O deploy não faz `pull`, e PostgreSQL, Node e nginx ficam na versão do primeiro download, com tags sem digest.
- **I7, Média:** não há Dependabot nem auditoria de dependências no CI.
- **I9, Média:** o backend conecta no PostgreSQL como superusuário. Uma injeção ou dependência comprometida ganharia `COPY … TO PROGRAM` e `DROP DATABASE`.
- **I10, Média:** o nginx não manda headers de segurança (CSP, `nosniff`, `Referrer-Policy`, `frame-ancestors`, `Permissions-Policy`) e mostra a versão (`server_tokens`).
- **I11, Baixa:** os POSTs sem corpo aceitam requisição de outro site (CSRF): `/sync-runs`, `/alerts/read-all`, `/alerts/:id/dismiss`, `/budgets/copy-previous`, `/categories/:id/archive`. A tailnet não tem ACL, e o Portainer e o Dozzle no mesmo servidor podem dar acesso aos `.env` (a confirmar).
- **I12, Baixa:** sem desligamento gracioso. O Node como PID 1 ignora o SIGTERM: cada deploy espera 10 s pelo `SIGKILL` e pode matar uma sincronização no meio.
- **I13, Baixa:** voltar versão exige rebuild (as imagens não têm tag de versão), e o `docker image prune` do deploy é global, atingindo os outros apps do servidor.
- **I14, Baixa:** o CI não faz build das imagens Docker, as actions são fixadas por tag e não por SHA, e a proteção da `main` não foi verificada.
- **I15, Baixa:** sem limite de memória num servidor de 8 GB compartilhado, e sem plano para trocar a versão maior do PostgreSQL.

A "Ordem sugerida" pede esta change "em paralelo, aos poucos": as tarefas estão em grupos independentes, cada um pode ser feito e posto em produção sozinho.

## What Changes

- **Imagens atualizadas e fixadas (I6, I13):** o deploy roda `compose pull db` e `build --pull`; as imagens base ficam fixadas por digest (o Dependabot atualiza); as imagens do app ganham tag com o commit (`valora-backend:<sha>`, `valora-frontend:<sha>`), o deploy guarda as 3 últimas e um `deploy.sh <ref>` de uma versão ainda guardada não reconstrói. A limpeza filtra pelo projeto do Compose (`label=com.docker.compose.project=valora`) e não toca nos outros apps.
- **Dependências vigiadas (I7, I14):** `.github/dependabot.yml` (npm do backend e do frontend, Docker e GitHub Actions), semanal e agrupado; `npm audit --omit=dev --audit-level=high` no CI; um job de `docker build` (sem push) das duas imagens; actions fixadas por SHA, com a versão em comentário. A proteção da `main` (exigir CI verde) é conferida e documentada; quem liga é o usuário, no GitHub.
- **Banco sem superusuário (I9):** papel `valora_app`, dono do schema e das tabelas, sem `SUPERUSER`, `CREATEDB` nem `CREATEROLE`. O backend conecta com ele; o usuário `valora` fica só para backup, restauração e manutenção. Uma vez, no servidor, um script cria o papel e passa a posse; numa instalação nova, o script de init do PostgreSQL faz o mesmo.
- **Headers de segurança (I10):** `security-headers.conf` incluído em **cada** `location` do nginx (um `add_header` no `location` anula os do `server`), com CSP validada com o service worker e o Recharts, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`, `Permissions-Policy` sem câmera, microfone e localização, e `server_tokens off`.
- **Requisição de outro site recusada (I11):** um hook `onRequest` no backend recusa com 403 `CROSS_SITE_REQUEST` todo método que não é `GET`/`HEAD`/`OPTIONS` quando `Sec-Fetch-Site` é `cross-site`. Sem o header (curl, scripts), passa. Ficam documentados a ACL da tailnet e o que conferir no Portainer e no Dozzle.
- **Desligamento gracioso (I12):** `init: true` nos serviços do Node; no backend, SIGTERM e SIGINT param o `Cron`, cancelam a segunda tentativa agendada, esperam a sincronização em curso terminar (até 60 s) e fecham o Fastify e o pool do PostgreSQL. `stop_grace_period: 75s` no backend.
- **Memória limitada (I15):** `mem_limit` por serviço (db 1 GB, backend 512 MB, frontend 128 MB, a calibrar com `docker stats` no servidor) e a seção "Atualizar o PostgreSQL" em `docs/05-deploy.md` (dump, volume novo, restore, restore-check, volta).

### Contraria documentos

- `docs/05-deploy.md` e o `CLAUDE.md` (seção "Comandos"): o deploy passa a fazer `pull` e a guardar imagens por versão; o backend conecta com outro usuário do banco. Os documentos são atualizados na mesma change.
- Nenhuma regra do `CLAUDE.md` muda. A regra "Nada de runner self-hosted" e "sem deploy pelo GitHub" continuam: o CI só faz build, sem push.

### Fora do escopo

- Cópia do backup fora de casa (decidido em 23/11/2026: fica de fora por ora).
- Mexer no Portainer, no Dozzle ou na ACL da tailnet: são do usuário, fora do repositório. A change só documenta o que conferir.
- Login ou acesso fora da Tailscale.
- Nenhum item da seção "Fora do escopo" de `docs/01-produto.md` é afetado.

### Roadmap

Não está em `docs/07-roadmap.md`: é a change nº 9 da "Ordem sugerida" de `docs/08` (I6, I7, I9, I10, I11, I12, I13, I14, I15). Ao arquivar, os nove são marcados como resolvidos.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `home-server-deploy`: imagens com digest e `pull` no deploy, tag por versão e volta sem rebuild, limpeza só do projeto, `init`, limites de memória, papel do banco sem superusuário, headers de segurança no nginx.
- `api-foundation`: recusa de escrita vinda de outro site e desligamento gracioso.
- `project-tooling`: Dependabot, auditoria de dependências, build das imagens no CI e actions por SHA.

## Impact

- **Infra:** `infra/compose.yml`, `infra/scripts/deploy.sh` (e os testes de `infra/scripts/tests/`), um script novo para criar o papel `valora_app` e um de init do PostgreSQL, `infra/.env.example`.
- **Backend:** `server.ts` (sinais), um plugin `onRequest` em `shared/`, `Dockerfile` (digest).
- **Frontend:** `nginx.conf`, `security-headers.conf` (novo), `Dockerfile` (digest).
- **GitHub:** `.github/dependabot.yml`, `.github/workflows/ci.yml`.
- **Testes:** testes dos scripts de `infra/` (tags, limpeza filtrada), teste de rota do hook de outro site, teste do desligamento (para o cron, espera a sincronização), teste da CSP no nginx com `curl -I` documentado.
- **Documentação:** `docs/05-deploy.md`, `docs/03-arquitetura.md` (segurança e Decisões), `CLAUDE.md` (Comandos) e `docs/08-revisao-e-proximas-fases.md`.
- **Dependências:** nenhuma nova no código. O Dependabot é configuração do GitHub.
