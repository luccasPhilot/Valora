# CLAUDE.md — backend

Vale só para `backend/`. As regras gerais do projeto estão em [../CLAUDE.md](../CLAUDE.md); como rodar, em [README.md](README.md). Não repita aqui o que já está lá.

## Antes de mexer

| Para... | Leia |
|---|---|
| Criar ou mudar tabela | [../docs/04-modelo-de-dados.md](../docs/04-modelo-de-dados.md) e `src/db/schema.ts` |
| Criar módulo, rota ou mudar a sincronização | [../docs/03-arquitetura.md](../docs/03-arquitetura.md) |
| Falar com o Pluggy | [../docs/02-open-finance.md](../docs/02-open-finance.md) |

## Regras do backend

- **Camadas:** `routes` (valida a entrada com Zod e chama o service) → `service` (regra de negócio, sem HTTP) → `repository` (única parte que fala com o banco). Módulo de exemplo: `src/modules/health/`.
- **Erros:** lance `ValidationError`, `NotFoundError` ou `ConflictError` (`src/shared/errors.ts`) com mensagem que identifica o recurso. O handler em `src/shared/error-handler.ts` converte para `{ "error": { "code", "message", "details" } }`. Erro inesperado vira `INTERNAL_ERROR`, sem stack.
- **Logs:** use `request.log` / `app.log`. Nunca registre corpo, query, valores, descrições, tokens ou credenciais, nem dentro do `catch` (logue só o tipo do erro).
- **Dinheiro:** `bigint` no banco (`*_cents`), `number` inteiro no código, validado por `centsSchema` (`src/shared/money.ts`).
- **Datas:** "hoje" e início de mês só por `src/shared/dates.ts` (fuso `America/Sao_Paulo`). Colunas `date` trafegam como texto `AAAA-MM-DD`.
- **Banco:** valores fechados são `text` + `CHECK` (não `pgEnum`). Toda mudança de schema gera migration nova com `npm run db:generate`; nunca edite uma migration já versionada.
- **Contrato da API:** mudou um endpoint, o `frontend/` muda na mesma change (schemas em `frontend/src/lib/api/`).
- **Imports** com extensão `.js` (ESM, `NodeNext`).

## Testes

- Unitários em `test/` (espelham `src/`), sem Docker. Integração em `test/integration/`, com PostgreSQL real (Testcontainers): `fixtures.ts` cria dados, `truncateAllTables` limpa entre os testes.
- Rotas se testam com `app.inject()`; `test/helpers/test-app.ts` monta o app sem banco no ar.
- Nome `should_<comportamento>_when_<condição>`, com `// Arrange`, `// Act`, `// Assert`.
- **Nunca chame a API real do Pluggy**; use respostas gravadas e anonimizadas.

## Antes de dar por pronto

`npm run typecheck`, `npm run lint`, `npm run format:check` e `npm test` (o de integração precisa do Docker rodando).
