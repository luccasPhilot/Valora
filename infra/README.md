# infra

Tudo o que roda o Valora com Docker, separado do código do `backend/` e do `frontend/`.

| Arquivo | O que é | Chega na change |
|---|---|---|
| `compose.dev.yml` | PostgreSQL 18 para desenvolvimento, preso ao `127.0.0.1` (pronto) | `setup-api-foundation` |
| `compose.yml` | Produção: `frontend` (nginx), `backend` e `db` (pronto) | `deploy-home-server` |
| `.env.example` | Variáveis da produção, sem valores reais (pronto) | `deploy-home-server` |
| `scripts/backup.sh` | Backup do banco com origem no nome (`weekly`, `predeploy`, `manual`), sem sobrescrever, e retenção em camadas (pronto) | `deploy-home-server`, `harden-backups` |
| `scripts/weekly-backup.sh` | Rotina de domingo (cron): backup, restore-check e aviso ao healthchecks.io (pronto) | `harden-backups` |
| `scripts/restore-check.sh` | Conferência da restauração do backup mais recente, em seis tabelas (pronto) | `deploy-home-server`, `harden-backups` |
| `scripts/disk-check.sh` | Uso de `/` e do disco dos backups, com aviso acima de 85% (pronto) | `harden-backups` |
| `scripts/lib/` | Funções comuns: nomes dos backups e avisos ao healthchecks.io | `harden-backups` |
| `scripts/tests/` | Testes dos scripts, em bash puro, com `docker`, `curl`, `df` e `date` de mentira | `harden-backups` |
| `scripts/deploy.sh` | Atualiza a produção, rodado no servidor: backup, troca de versão, build e healthchecks (pronto, sem change própria) | CI/CD |

Os `Dockerfile` ficam dentro de cada parte (`backend/Dockerfile`, `frontend/Dockerfile`). O passo a passo do servidor está em [docs/05-deploy.md](../docs/05-deploy.md).

## Produção

```bash
docker compose -f infra/compose.yml up -d --build   # primeira subida (a partir da raiz do repositório)
infra/scripts/deploy.sh                             # atualizações: backup predeploy, build e healthchecks
infra/scripts/backup.sh manual                      # backup na hora (o cron roda o weekly-backup.sh aos domingos)
infra/scripts/restore-check.sh                      # prova que o backup mais recente restaura
infra/scripts/disk-check.sh                         # uso do disco (o cron roda todo dia às 06:00)
```

**Retenção:** semanais por 8 semanas e, depois, o primeiro de cada mês por 12 meses; `predeploy` e `manual` por 30 dias; os 3 mais recentes de cada origem ficam sempre. Arquivo com nome fora do padrão nunca é apagado.

O passo a passo do servidor (Docker, Tailscale, cron, segundo disco, avisos de falha) está em [docs/05-deploy.md](../docs/05-deploy.md).

## Testes dos scripts

```bash
bash infra/scripts/tests/run-tests.sh               # no Linux ou no WSL (o Git Bash do Windows não serve)
```

Cada `should_*` de `scripts/tests/test-*.sh` roda numa pasta temporária, com os comandos de `scripts/tests/stubs/` no começo do `PATH`: nada fala com o Docker, o banco ou o healthchecks.io de verdade. O CI roda os mesmos testes no job `infra`.

## Banco de desenvolvimento

```bash
docker compose -f infra/compose.dev.yml up -d      # sobe (a partir da raiz do repositório)
docker compose -f infra/compose.dev.yml down       # para, mantendo os dados
docker compose -f infra/compose.dev.yml down -v    # para e apaga os dados
```

Usuário, senha e banco de desenvolvimento são `valora` / `valora_dev` / `valora`, o que o `backend/.env.example` já usa.
