## Context

O alvo é um PC ou notebook com Linux, ligado 24 horas (`docs/05-deploy.md`). O repositório tem três partes independentes, como no CellCare:
- `backend/`: API Node, mais o agendamento da sincronização;
- `frontend/`: React + Vite;
- `infra/`: Docker Compose e scripts do servidor.

As regras de segurança do CLAUDE.md exigem:
- só o front preso ao `127.0.0.1`;
- publicação só por `tailscale serve`;
- nunca `tailscale funnel`;
- credenciais só no `.env`.

## Goals / Non-Goals

**Goals:**
- Subir e atualizar o app com um comando.
- Nada do Valora alcançável fora da Tailscale.
- Backup diário que comprovadamente restaura.

**Non-Goals:**
- PWA, monitoramento externo, CI/CD, alta disponibilidade.

## Decisions

**1. Uma imagem por parte, como no CellCare.**
- `backend/Dockerfile`, em etapas:
  1. `npm ci`;
  2. `npm run build` (`tsc`, saída em `dist/`);
  3. imagem final com `dist/` e `npm ci --omit=dev`, usuário `node`.
- `frontend/Dockerfile`, em etapas:
  1. `npm ci` e `npm run build` (Vite);
  2. imagem final `nginxinc/nginx-unprivileged`, que roda sem root e escuta na porta 8080, com o `dist/` e o `nginx.conf`.
- *Alternativa:* uma imagem só, com a API servindo o front. Foi descartada quando o repositório passou a ter partes independentes: ela obrigaria o build do backend a conhecer o do frontend.

**2. nginx na frente.**
- O `nginx.conf` tem `try_files $uri /index.html` para as rotas do app.
- `location /api/` faz `proxy_pass http://backend:3000` (nome do serviço no Compose), mantendo o caminho.
- Arquivos com hash no nome (gerados pelo Vite) ganham cache longo; o `index.html` nunca vai para o cache.

**3. Só o front publica porta.**
- `frontend`: `ports: ["127.0.0.1:3000:8080"]`.
- `backend` e `db` não publicam porta; só a rede interna do Compose os alcança.
- O `tailscale serve --bg 3000` roda no host e alcança a porta local do front.

**4. Compose em `infra/`.**
- `infra/compose.yml` aponta o `build.context` para `../backend` e `../frontend`.
- As variáveis ficam em `infra/.env`.
- Os comandos rodam com `-f infra/compose.yml` a partir da raiz, ou de dentro da pasta `infra/`.

**5. Healthchecks.**
- `backend`: `node -e "fetch('http://localhost:3000/api/v1/health')..."`, porque a imagem do Node não tem `curl`.
- `frontend`: `wget -qO- http://localhost:8080/`.
- `db`: `pg_isready`.

**6. Backup pelo cron do host, não por container.**
- `infra/scripts/backup.sh` usa `docker compose -f /opt/valora/infra/compose.yml exec -T db pg_dump -Fc`.
- Com `set -euo pipefail`, o script grava em arquivo temporário e só renomeia e aplica a retenção se o dump terminar bem.
- O destino é `BACKUP_DIR` (padrão `/mnt/backup/valora`).
- *Alternativa:* um container de backup com cron interno é mais uma peça; o cron do host é simples e visível.

**7. Conferência de restauração com banco temporário.**
`infra/scripts/restore-check.sh`:
1. cria `valora_restore_check` no mesmo PostgreSQL;
2. roda `pg_restore`;
3. compara `count(*)` de `transactions`, `accounts` e `categories` com o banco em uso;
4. imprime o resultado e apaga o banco temporário.

**8. Migrations no início, backup antes de atualizar.**
- As migrations já rodam no início do backend (`setup-api-foundation`).
- O procedimento de atualização pede o backup manual antes.
- O rollback é restaurar o backup e voltar o código com `git checkout` da versão anterior.

**9. Versões fixadas.**
- As imagens base do Node usam a mesma versão do `.nvmrc`.
- A imagem do PostgreSQL usa a mesma versão de desenvolvimento e testes.
- A do nginx fica fixada pela versão maior e menor.

## Risks / Trade-offs

- [Três containers em vez de um] → É o mesmo padrão do CellCare, e cada parte pode ser atualizada e testada sozinha. O custo é um container de nginx a mais, leve.
- [Disco do servidor e disco de backup no mesmo gabinete se perderem juntos (roubo, incêndio)] → `docs/05-deploy.md` recomenda uma cópia criptografada fora de casa (por exemplo, `rclone`); fica como passo opcional, fora desta change.
- [`tailscale serve` desligado depois de reiniciar o host] → O `--bg` persiste a configuração; a conferência inclui reiniciar o servidor e testar o acesso.
- [Atualização com migration ruim] → Backup manual antes de toda atualização e rollback documentado.

## Migration Plan

1. Preparar o servidor (Docker, Tailscale, segundo disco).
2. Clonar o repositório em `/opt/valora` e preencher o `infra/.env`.
3. `docker compose -f infra/compose.yml up -d --build`.
4. `tailscale serve --bg 3000`.
5. Instalar o cron do backup.
6. Rodar a conferência de restauração.

Rollback: `docker compose -f infra/compose.yml down` (os dados ficam no volume).

## Open Questions

- Caminho de montagem do segundo disco no servidor (padrão sugerido: `/mnt/backup`).
