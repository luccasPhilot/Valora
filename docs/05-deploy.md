# Deploy no servidor de casa

O alvo é um **PC ou notebook com Linux** (Ubuntu Server, Debian ou parecido), ligado 24 horas. Os comandos abaixo são referência. O Compose de desenvolvimento já existe (`setup-api-foundation`); os arquivos de produção nascem na `deploy-home-server`; veja o [roadmap](07-roadmap.md).

Tudo o que é de deploy fica na pasta [`infra/`](../infra/README.md), separado do código. Cada parte tem o próprio `Dockerfile`: `backend/Dockerfile` e `frontend/Dockerfile`.

## Requisitos

- Linux de 64 bits, 2 GB de RAM ou mais.
- Docker Engine com o plugin Compose ([instruções oficiais](https://docs.docker.com/engine/install/)).
- Conta na [Tailscale](https://tailscale.com), com o app instalado no servidor, no celular e no notebook.
- **Um segundo disco** (ou um destino externo) para o backup. Backup no mesmo disco não protege de disco queimado.

## Containers

São três, definidos em `infra/compose.yml`:

| Serviço | O que é | Rede |
|---|---|---|
| `frontend` | nginx com o front compilado; repassa `/api` para o backend | porta 3000 só em `127.0.0.1`, a única publicada |
| `backend` | Node + Fastify: API e sincronização agendada | só na rede interna do Compose |
| `db` | PostgreSQL (imagem oficial, versão fixada) com os dados num volume | só na rede interna do Compose |

A porta do front fica presa ao `127.0.0.1` de propósito: nem a rede de casa enxerga o Valora. O único caminho de entrada é a Tailscale. O backend e o banco não publicam porta nenhuma.

As migrations do banco rodam sozinhas quando o backend inicia.

## Desenvolvimento

O banco de desenvolvimento roda com o Compose de desenvolvimento; o backend e o frontend rodam direto na máquina, cada um na sua pasta:

```bash
docker compose -f infra/compose.dev.yml up -d
```

O front em desenvolvimento usa o proxy do Vite para chamar a API, sem nginx.

## Acesso pela Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

1. No painel da Tailscale, ative **MagicDNS** e **HTTPS Certificates**.
2. No servidor, publique o app só para a sua rede Tailscale:

```bash
sudo tailscale serve --bg 3000
```

O app fica em `https://<nome-da-maquina>.<sua-tailnet>.ts.net`, com certificado válido. O HTTPS é obrigatório para instalar o PWA no celular.

**Nunca use `tailscale funnel`**: ele publica o app na internet aberta. A v1 não tem tela de login justamente porque só os seus aparelhos chegam até ela.

## Variáveis de ambiente

Em produção, ficam em `infra/.env` no servidor. O repositório só tem os exemplos, sem valores reais: `infra/.env.example` (produção) e `backend/.env.example` (desenvolvimento).

| Variável | Exemplo | Para quê |
|---|---|---|
| `POSTGRES_PASSWORD` | (gerar uma senha longa) | Senha do banco |
| `DATABASE_URL` | `postgres://valora:<senha>@db:5432/valora` | Conexão do backend com o banco |
| `PLUGGY_CLIENT_ID` | (do dashboard do Pluggy) | Credencial da sua aplicação |
| `PLUGGY_CLIENT_SECRET` | (do dashboard do Pluggy) | Credencial da sua aplicação |
| `PLUGGY_ITEM_IDS` | (ids dos bancos no Meu Pluggy) | Bancos que a sincronização lê |
| `SYNC_CRON` | `0 7 * * *` | Horário da sincronização diária |
| `TZ` | `America/Sao_Paulo` | Fuso dos containers |
| `PORT` | `3000` | Porta do backend dentro da rede do Compose |
| `LOG_LEVEL` | `info` | Nível dos logs |

O backend valida as variáveis com Zod ao iniciar e para na hora, com mensagem clara, se faltar alguma.

## Backup

O Open Finance só devolve 12 meses. **O que for mais antigo só existe no seu banco de dados**, então o backup é parte do deploy, não um extra.

- **Quando:** todo dia às 03:00, pelo cron do servidor.
- **Como:** `pg_dump` no formato custom, salvo no segundo disco.
- **Retenção:** 30 dias.
- **Cópia fora de casa (recomendado):** mandar o arquivo criptografado para um armazenamento na nuvem (por exemplo, com `rclone`), para o caso de roubo ou incêndio.

Exemplo do script (`infra/scripts/backup.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR=/mnt/backup/valora
mkdir -p "$BACKUP_DIR"
docker compose -f /opt/valora/infra/compose.yml exec -T db \
  pg_dump -U valora -Fc valora > "$BACKUP_DIR/valora-$(date +%F).dump"
find "$BACKUP_DIR" -name 'valora-*.dump' -mtime +30 -delete
```

E a linha no `crontab -e`:

```
0 3 * * * /opt/valora/infra/scripts/backup.sh >> /var/log/valora-backup.log 2>&1
```

### Restaurar

```bash
docker compose -f /opt/valora/infra/compose.yml exec -T db pg_restore -U valora -d valora --clean --if-exists < /mnt/backup/valora/valora-AAAA-MM-DD.dump
```

**Teste a restauração uma vez por mês.** Backup que nunca foi restaurado não é garantia. O `infra/scripts/restore-check.sh` faz essa conferência num banco temporário.

## Atualizar o app

```bash
cd /opt/valora
git pull
docker compose -f infra/compose.yml up -d --build
```

As migrations rodam no início do backend. Antes de uma atualização com mudança de banco, rode o backup na mão.

## Saúde

- O Compose tem healthcheck nos três serviços: o front pelo nginx, `GET /api/v1/health` no backend, `pg_isready` no banco.
- A tela de Contas mostra a última sincronização de cada banco. A partir da v2, sincronização com falha vira alerta no app.
- Os logs nunca registram valores, descrições de transações nem credenciais.
