# infra

Tudo o que roda o Valora com Docker, separado do código do `backend/` e do `frontend/`.

| Arquivo | O que é | Chega na change |
|---|---|---|
| `compose.dev.yml` | PostgreSQL 18 para desenvolvimento, preso ao `127.0.0.1` (pronto) | `setup-api-foundation` |
| `compose.yml` | Produção: `frontend` (nginx), `backend` e `db` (pronto) | `deploy-home-server` |
| `.env.example` | Variáveis da produção, sem valores reais (pronto) | `deploy-home-server` |
| `scripts/backup.sh` | Backup diário do banco, com retenção de 30 dias (pronto) | `deploy-home-server` |
| `scripts/restore-check.sh` | Conferência da restauração do backup (pronto) | `deploy-home-server` |
| `scripts/deploy.sh` | Atualiza a produção, rodado no servidor: backup, troca de versão, build e healthchecks (pronto, sem change própria) | CI/CD |

Os `Dockerfile` ficam dentro de cada parte (`backend/Dockerfile`, `frontend/Dockerfile`). O passo a passo do servidor está em [docs/05-deploy.md](../docs/05-deploy.md).

## Produção

```bash
docker compose -f infra/compose.yml up -d --build   # primeira subida (a partir da raiz do repositório)
infra/scripts/deploy.sh                             # atualizações: backup, build e healthchecks
infra/scripts/backup.sh                             # backup na hora (o cron roda às 03:00)
infra/scripts/restore-check.sh                      # prova que o último backup restaura
```

O passo a passo do servidor (Docker, Tailscale, cron, segundo disco) está em [docs/05-deploy.md](../docs/05-deploy.md).

## Banco de desenvolvimento

```bash
docker compose -f infra/compose.dev.yml up -d      # sobe (a partir da raiz do repositório)
docker compose -f infra/compose.dev.yml down       # para, mantendo os dados
docker compose -f infra/compose.dev.yml down -v    # para e apaga os dados
```

Usuário, senha e banco de desenvolvimento são `valora` / `valora_dev` / `valora`, o que o `backend/.env.example` já usa.
