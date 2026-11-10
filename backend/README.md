# backend

API do Valora: Node + Fastify + Zod, PostgreSQL com Drizzle. Projeto independente (tem o próprio `package.json` e `package-lock.json`). Visão geral do sistema em [docs/03-arquitetura.md](../docs/03-arquitetura.md).

## Rodar em desenvolvimento

Requisitos: Node 26 (`nvm use` na raiz do repositório) e Docker.

```bash
# 1. Banco de desenvolvimento (na raiz do repositório)
docker compose -f infra/compose.dev.yml up -d

# 2. Dentro de backend/
cd backend
cp .env.example .env     # já aponta para o banco do passo 1; preencha as variáveis do Pluggy
npm ci
npm run dev              # aplica as migrations e sobe em http://127.0.0.1:3000
```

Conferência: `curl http://127.0.0.1:3000/api/v1/health` responde `{"status":"ok","database":"ok"}`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | API com recarga automática (`tsx watch`), lendo o `.env` |
| `npm run build` / `npm start` | Compila para `dist/` / roda a versão compilada (variáveis vêm do ambiente) |
| `npm run typecheck` | Verifica os tipos |
| `npm run lint` / `npm run lint:fix` | ESLint / com correção automática |
| `npm run format` / `npm run format:check` | Prettier |
| `npm test` | Testes unitários e de integração |
| `npm run test:unit` | Só os unitários (não precisa do Docker) |
| `npm run test:integration` | Só os de integração (sobem um PostgreSQL com Testcontainers; precisam do Docker) |
| `npm run db:generate` | Gera uma migration a partir das mudanças em `src/db/schema.ts` |
| `npm run fixtures:categories` | Chama a API real do Pluggy e grava a lista pública de categorias em `test/fixtures/pluggy/categories.json`. Depois de regravar, atualize `src/modules/categories/seed/pluggy-categories.ts` e o mapeamento inicial (um teste confere a lista) |
| `npm run fixtures:record` | Chama a API real do Pluggy uma vez e regrava as fixtures anonimizadas de `test/fixtures/pluggy/`. Grava também as faturas de cada cartão. Mostra só um resumo com contagens (sinal por tipo de conta, horário das datas, status de cada banco, campos presentes nas faturas). Use com o `.env` apontando para os bancos reais: no sandbox do Pluggy ele regrava as fixtures com o conector errado (o MeuPluggy tem id 200) |

## Sincronização

Roda todo dia no horário do `SYNC_CRON` (fuso de São Paulo) e quando alguém chama a rota:

```bash
curl -X POST http://127.0.0.1:3000/api/v1/sync-runs     # 202; 409 SYNC_IN_PROGRESS se já estiver rodando
curl http://127.0.0.1:3000/api/v1/sync-runs/latest      # status e quantidades da última execução
curl http://127.0.0.1:3000/api/v1/connections           # cada banco, com status e última sincronização
```

As categorias padrão e o mapeamento inicial do Pluggy são criados na subida da API (`src/modules/categories/`), sem repetir nada se já existirem. O código da sincronização fica em `src/modules/sync/` (`PluggyClient`, `SyncService`, repositories e rotas) e `src/modules/connections/`. Regras em [docs/03-arquitetura.md](../docs/03-arquitetura.md#sincronização).

## Variáveis de ambiente

Validadas com Zod ao iniciar (`src/shared/config.ts`). O app para citando o nome da variável com problema, sem imprimir valores.

| Variável | Padrão | O que é |
|---|---|---|
| `DATABASE_URL` | obrigatória | Conexão com o PostgreSQL |
| `HOST` | `127.0.0.1` | Endereço em que a API escuta (no Docker, `0.0.0.0`) |
| `PORT` | `3000` | Porta da API |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent` |
| `PLUGGY_CLIENT_ID` | obrigatória | Credencial da sua aplicação no dashboard do Pluggy |
| `PLUGGY_CLIENT_SECRET` | obrigatória | Credencial da sua aplicação no dashboard do Pluggy |
| `PLUGGY_ITEM_IDS` | obrigatória | Ids dos bancos (itens do MeuPluggy), separados por vírgula ([como achar](../docs/02-open-finance.md#ids-dos-itens-no-valora)) |
| `SYNC_CRON` | `0 7 * * *` | Horário da sincronização diária, no fuso `America/Sao_Paulo` |

## Estrutura

```
src/
├── server.ts          carrega a configuração, aplica as migrations e sobe a API
├── app.ts             buildApp(): monta o Fastify (usado também pelos testes)
├── db/                schema Drizzle, conexão e migrations
├── modules/<nome>/    uma pasta por funcionalidade: routes → service → repository
└── shared/            configuração, erros, logs, dinheiro e datas
drizzle/               migrations SQL geradas (versionadas)
test/                  espelha src/; test/integration/ usa o PostgreSQL real
```

## Banco e migrations

1. Mude `src/db/schema.ts`.
2. `npm run db:generate` cria o SQL em `drizzle/`. Revise e versione o arquivo.
3. A API aplica as migrations sozinha ao iniciar. Para recomeçar do zero em desenvolvimento: `docker compose -f infra/compose.dev.yml down -v` e suba de novo.
