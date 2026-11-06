## Why

A v1 só cumpre o objetivo quando roda sozinha no servidor de casa, sincronizando todo dia e abrindo no celular com segurança. Como o Open Finance só devolve 12 meses, o banco de dados do servidor vira a única cópia do histórico, então o backup testado faz parte do deploy, não é um extra.

## What Changes

- Cria o `backend/Dockerfile`: imagem da API (Node), compilada com `tsc`, rodando sem root.
- Cria o `frontend/Dockerfile` e o `frontend/nginx.conf`: imagem com o front compilado servido por nginx, sem root.
  - O nginx devolve o `index.html` para as rotas do app.
  - O nginx repassa `/api` para o backend.
- Cria o `infra/compose.yml` de produção, com três serviços:
  - `frontend`, preso ao `127.0.0.1:3000`, o único com porta publicada;
  - `backend`, só na rede interna do Compose;
  - `db` (PostgreSQL), sem porta, com os dados num volume.

  Os três têm healthcheck, reinício automático e fuso `America/Sao_Paulo`.
- Cria o `infra/.env.example` com todas as variáveis da produção, sem valores reais.
- Cria `infra/scripts/backup.sh` (`pg_dump` aos domingos às 03:00, retenção de 30 dias, segundo disco) e `infra/scripts/restore-check.sh`.
- Documenta e executa a publicação pela Tailscale com HTTPS (`tailscale serve`) e o procedimento de atualização.
- Executa e registra uma restauração de teste.

Itens do roadmap cobertos (Fase 1 → Servidor de casa):
- `Dockerfile` do backend e do frontend, e `infra/compose.yml` de produção.
- Front preso ao `127.0.0.1`, publicado só pela Tailscale com HTTPS.
- Backup semanal com retenção de 30 dias e uma restauração testada.

## Capabilities

### New Capabilities

- `home-server-deploy`: imagens do backend e do frontend, compose de produção, acesso só pela Tailscale, backup semanal, restauração testada e atualização.

### Modified Capabilities

Nenhuma.

## Impact

- **Arquivos novos:**
  - `backend/Dockerfile`, `backend/.dockerignore`;
  - `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf`;
  - `infra/compose.yml`, `infra/.env.example`, `infra/scripts/backup.sh`, `infra/scripts/restore-check.sh`;
  - `infra/scripts/deploy.sh` e `.github/workflows/ci.yml` (feitos antes desta change, sem change própria).
- **Servidor:** PC com Linux, Docker Engine com o plugin Compose, Tailscale e um segundo disco.
- **Documentação:** `docs/05-deploy.md` com os comandos finais; `infra/README.md`; seção "Comandos" do `CLAUDE.md`.

## Fora do escopo

- PWA instalável e funcionamento sem rede (Fase 2, `installable-pwa`).
- Acesso pela internet aberta (`tailscale funnel`) e tela de login: proibidos enquanto não houver login.
- Monitoramento externo e alertas por e-mail.
- Deploy automático pelo GitHub (runner no servidor): descartado. A atualização é o `infra/scripts/deploy.sh`, rodado no servidor.
