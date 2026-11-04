## Context

Depende de `setup-repository`. A arquitetura (docs/03-arquitetura.md) define Fastify, Zod, PostgreSQL e Drizzle, com camadas Controller → Service → Repository. O modelo de dados (docs/04-modelo-de-dados.md) lista as tabelas da v1. O CLAUDE.md exige centavos inteiros, ids do Pluggy únicos, erro em formato único e logs sem dados financeiros.

## Goals / Non-Goals

**Goals:**
- Uma API que só sobe com configuração válida e banco migrado.
- Todas as tabelas da v1 criadas de uma vez, para as próximas changes só escreverem regras de negócio.
- Testes de integração contra um PostgreSQL de verdade.

**Non-Goals:**
- Regras de negócio, rotas de domínio, seeds (categorias, conta "Dinheiro").
- Servir o front-end ou empacotar para produção.

## Decisions

**1. App montado por uma função `buildApp(config)`.**
`server.ts` só chama `buildApp` e `listen`. Os testes usam `app.inject()` sem abrir porta. Cada módulo (`modules/<nome>/`) registra suas rotas como plugin com prefixo `/api/v1`.

**2. Validação com `fastify-type-provider-zod`.**
Os schemas Zod das rotas validam a entrada e tipam o handler. O front não importa nada do backend: ele tem os próprios schemas para validar as respostas (veja "Contrato da API" em docs/03-arquitetura.md).
- *Alternativa:* JSON Schema nativo do Fastify duplicaria os tipos que já existem em Zod.

**3. `pg` (node-postgres) com `drizzle-orm/node-postgres`.**
- *Alternativa:* `postgres.js` também funciona; `pg` é o mais usado e o que o Testcontainers e o `drizzle-kit` documentam melhor.

**4. `bigint` no banco, `number` inteiro no TypeScript.**
O Drizzle lê `bigint` com `mode: 'number'`. Um schema Zod `z.number().int()` (e `Number.isSafeInteger`) guarda toda escrita de valores.
- Centavos cabem com folga no inteiro seguro do JavaScript (até R$ 90 trilhões).
- *Alternativa:* `bigint` do JavaScript complica JSON e todo cálculo no front sem ganho real.

**5. Valores fechados como `text` + `CHECK`, não `pgEnum`.**
Adicionar um valor depois é uma migration simples (trocar o `CHECK`), sem as limitações de `ALTER TYPE`.

**6. Ids `uuid` com `gen_random_uuid()`** (nativo no PostgreSQL 13+). Os `pluggy_*_id` têm índice único parcial (`WHERE ... IS NOT NULL`), para aceitar vários nulos.

**7. Migrations SQL geradas pelo `drizzle-kit` e versionadas.**
O migrator do Drizzle roda no `buildApp`, antes do `listen`. O projeto tem um único processo, então não precisa de lock de migration.

**8. Erros de domínio.**
- `AppError` base, com `code`, `statusCode` e `details`; subclasses `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409).
- Um `setErrorHandler` converte `AppError`, erros do Zod e 404 de rota para o formato padrão.
- Qualquer outro erro vira `INTERNAL_ERROR` (500). Nesse caso, o log registra só o tipo do erro e a rota, sem a mensagem, que pode conter dados.

**9. Logs pelo pino do Fastify, com serializers próprios.**
- `req` registra só método e caminho sem query; `res` registra só status.
- `redact` cobre `authorization`, `cookie` e `x-api-key`.
- Nenhum log de corpo de requisição ou de resposta.

**10. Configuração em `shared/config.ts`.**
`loadConfig(env)` é uma função pura, testada com objetos de ambiente falsos. A mensagem de erro cita só o nome da variável.

**11. Datas em `backend/src/shared/dates.ts`.**
`todayInSaoPaulo()`, `toSaoPauloDate(instant)` e `firstDayOfMonth()` usam `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`, sem biblioteca extra.

**12. Desenvolvimento e testes.**
- `infra/compose.dev.yml` tem só o PostgreSQL, preso ao `127.0.0.1:5432`.
- A API roda em desenvolvimento com `tsx watch`; o build de produção usa `tsc`, com saída em `dist/`, como no CellCare.
- Os testes de integração sobem um PostgreSQL com `@testcontainers/postgresql` uma vez por execução, aplicam as migrations e limpam as tabelas entre os testes.

## Risks / Trade-offs

- [Testcontainers exige Docker rodando na máquina de desenvolvimento] → Os testes de integração ficam num projeto Vitest separado (`api:integration`). O `npm test` roda os dois, e a mensagem de erro explica quando o Docker não está disponível.
- [Criar todas as tabelas da v1 agora pode exigir ajustes quando os dados reais do Pluggy chegarem] → Ajustes viram migrations novas, e o `docs/04-modelo-de-dados.md` é atualizado na mesma change.
- [`number` para centavos depende de nunca passar de 2^53] → O schema Zod de escrita rejeita valores fora do inteiro seguro.

## Migration Plan

Primeira migration do projeto. Num banco vazio, não há o que migrar; o rollback é apagar o banco de desenvolvimento.

## Open Questions

- Versão do PostgreSQL: a estável mais recente com imagem oficial no dia da implementação, a mesma no `infra/compose.dev.yml`, nos testes e na produção.
