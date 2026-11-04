## 1. Infraestrutura de desenvolvimento

- [x] 1.1 Criar `infra/compose.dev.yml` com o PostgreSQL (versão fixada, porta só em `127.0.0.1`, volume nomeado)
- [x] 1.2 Adicionar `DATABASE_URL`, `PORT`, `LOG_LEVEL` e `TZ` ao `backend/.env.example`
- [x] 1.3 Instalar as dependências da API (`fastify`, `fastify-type-provider-zod`, `zod`, `drizzle-orm`, `pg`, `drizzle-kit`, `tsx`, `@testcontainers/postgresql`)

## 2. Configuração e servidor

- [x] 2.1 Implementar `loadConfig(env)` com Zod, com testes para variável ausente, valor inválido e mensagem sem valores
- [x] 2.2 Implementar `buildApp(config)` com prefixo `/api/v1` e o type provider do Zod
- [x] 2.3 Implementar `server.ts` (carregar configuração, montar o app, aplicar migrations, `listen`)
- [x] 2.4 Scripts `dev` (`tsx watch src/server.ts`), `build` (`tsc`, saída em `dist/`) e `start` (`node dist/server.js`) no backend

## 3. Erros e logs

- [x] 3.1 Criar `AppError`, `ValidationError`, `NotFoundError` e `ConflictError`
- [x] 3.2 Implementar o error handler (formato padrão; Zod → `VALIDATION_ERROR`; rota inexistente → `NOT_FOUND`; outros → `INTERNAL_ERROR` sem stack)
- [x] 3.3 Configurar o logger com serializers que registram só método, caminho sem query, status e duração, mais `redact` de cabeçalhos sensíveis
- [x] 3.4 Testes: entrada inválida (400), recurso inexistente (404), erro inesperado (500 sem stack), log sem corpo e sem query

## 4. Banco de dados

- [x] 4.1 Escrever o schema Drizzle das onze tabelas da v1, conforme `docs/04-modelo-de-dados.md` (inclui `source`, `possible_duplicate_of_id` e `type = 'cash'`)
- [x] 4.2 Adicionar os `CHECK` dos valores fechados, os índices únicos parciais dos `pluggy_*_id`, as chaves primárias compostas das fotos e o `CHECK` de `budgets.month` no dia 1
- [x] 4.3 Gerar a primeira migration com `drizzle-kit` e versioná-la
- [x] 4.4 Aplicar as migrations no início do app
- [x] 4.5 Criar o schema Zod de valores em centavos (inteiro seguro) em `backend/src/shared/`

## 5. Datas

- [x] 5.1 Implementar `todayInSaoPaulo`, `toSaoPauloDate` e `firstDayOfMonth` em `backend/src/shared/dates.ts`
- [x] 5.2 Testes de datas, incluindo o caso do servidor em UTC perto da meia-noite

## 6. Saúde e testes de integração

- [x] 6.1 Implementar `GET /api/v1/health` (200 com banco de pé, 503 com banco fora do ar)
- [x] 6.2 Configurar o Testcontainers (um PostgreSQL por execução, migrations aplicadas, tabelas limpas entre testes) num projeto Vitest `api:integration`
- [x] 6.3 Testes de integração: health 200 e 503, migrations idempotentes, id do Pluggy repetido rejeitado, vários nulos aceitos, `CHECK` de status, centavos negativos, foto do mesmo dia, mês fora do dia 1

## 7. Documentação

- [x] 7.1 Atualizar a seção "Comandos" do `CLAUDE.md` (subir o banco de desenvolvimento, rodar a API, migrations, testes de integração)
- [x] 7.2 Atualizar `docs/04-modelo-de-dados.md` se alguma coluna mudou na implementação
- [x] 7.3 Marcar como `[x]` os itens de "Back-end" da Fase 0 em `docs/07-roadmap.md`
