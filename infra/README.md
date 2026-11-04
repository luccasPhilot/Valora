# infra

Tudo o que roda o Valora com Docker, separado do código do `backend/` e do `frontend/`.

| Arquivo | O que é | Chega na change |
|---|---|---|
| `compose.dev.yml` | PostgreSQL para desenvolvimento, preso ao `127.0.0.1` | `setup-api-foundation` |
| `compose.yml` | Produção: `frontend` (nginx), `backend` e `db` | `deploy-home-server` |
| `.env.example` | Variáveis da produção, sem valores reais | `deploy-home-server` |
| `scripts/backup.sh` | Backup diário do banco | `deploy-home-server` |
| `scripts/restore-check.sh` | Conferência da restauração do backup | `deploy-home-server` |

Os `Dockerfile` ficam dentro de cada parte (`backend/Dockerfile`, `frontend/Dockerfile`). O passo a passo do servidor está em [docs/05-deploy.md](../docs/05-deploy.md).
