# CLAUDE.md — infra

Vale só para `infra/`. Regras gerais em [../CLAUDE.md](../CLAUDE.md); guia do servidor em [../docs/05-deploy.md](../docs/05-deploy.md).

- Só o `frontend` (nginx) publica porta, presa ao `127.0.0.1`. Backend e banco ficam só na rede interna do Compose. Nunca `tailscale funnel`.
- Segredos só em `infra/.env` (ignorado pelo git). O `.env.example` não tem valores reais.
- A imagem do PostgreSQL é a mesma em `compose.dev.yml`, nos testes de integração (`backend/test/integration/global-setup.ts`) e na produção. Trocou a versão, troque nos três.
- PostgreSQL 18+: o volume monta em `/var/lib/postgresql` (não em `/var/lib/postgresql/data`).
- Backup: toda mudança no banco ou no compose de produção mantém o `scripts/restore-check.sh` funcionando.
