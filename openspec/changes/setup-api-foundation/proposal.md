## Why

Todas as funcionalidades da v1 dependem de uma API que valide a configuração, responda erros num formato único, não vaze dados financeiros nos logs e tenha o banco de dados criado com as regras do Valora, como dinheiro em centavos e chaves únicas do Pluggy. Esta change monta essa base antes de qualquer regra de negócio.

## What Changes

- Sobe o Fastify com rotas sob `/api/v1` e a rota `GET /api/v1/health`, que verifica o banco.
- Lê o `.env` e valida com Zod na inicialização; o app para com mensagem clara se faltar algo.
- Define o formato padrão de erro `{ "error": { "code", "message", "details" } }` e as classes de erro de domínio.
- Configura logs que nunca registram corpo de requisição, valores, descrições, tokens ou credenciais.
- Configura o Drizzle com PostgreSQL e cria a primeira migration com **todas as tabelas da v1** do modelo de dados, incluindo as colunas de lançamento manual.
- Aplica as migrations sozinhas na inicialização.
- Cria o `infra/compose.dev.yml` com o PostgreSQL para desenvolvimento.
- Configura testes de integração com Testcontainers (PostgreSQL real).
- Cria em `backend/src/shared/dates.ts` os utilitários de data no fuso `America/Sao_Paulo`. O front tem os dele, criados na `setup-web-foundation`.

Itens do roadmap cobertos (Fase 0 → Back-end):
- Docker Compose com PostgreSQL para desenvolvimento.
- Drizzle configurado, com a primeira migration (tabelas da v1).
- Fastify com `GET /api/v1/health`.
- Configuração lida do `.env` e validada com Zod.
- Formato padrão de erro e logger sem dados financeiros.
- Teste de integração com Testcontainers rodando.

## Capabilities

### New Capabilities

- `api-foundation`: servidor HTTP, rotas versionadas, health check, validação da configuração, formato de erro e logs sem dados sensíveis.
- `database-schema`: tabelas da v1, migrations automáticas e as restrições do banco (centavos, unicidade por id do Pluggy, valores permitidos).

### Modified Capabilities

Nenhuma.

## Impact

- **Código novo:** `backend/src/server.ts`, `backend/src/shared/` (config, erros, logger), `backend/src/db/` (schema e migrations), `backend/src/shared/dates.ts`.
- **Dependências:** `fastify`, `fastify-type-provider-zod`, `zod`, `drizzle-orm`, `drizzle-kit`, `pg`, `tsx` (desenvolvimento), `@testcontainers/postgresql`.
- **Arquivos:** `infra/compose.dev.yml`; variáveis novas no `backend/.env.example` (`DATABASE_URL`, `PORT`, `LOG_LEVEL`, `TZ`).
- **Documentação:** `docs/04-modelo-de-dados.md`, se algum detalhe de coluna mudar na implementação; comandos no `CLAUDE.md`.

## Fora do escopo

- Integração com o Pluggy e sincronização (`sync-open-finance`).
- Categorias padrão e conta "Dinheiro" (`transaction-categorization` e `manual-transactions`).
- Tabelas da v2 e v3 (`credit_card_bills`, `planned_entries`, `goals`, `alerts`).
- Servir o front-end e o compose de produção (`deploy-home-server`).
- Tela de login (o projeto não tem login na v1).
