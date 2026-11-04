# Valora

*Suas finanças, com mais clareza.*

App pessoal de finanças que junta contas, cartões, orçamentos, metas e investimentos num lugar só. As transações chegam sozinhas pelo Open Finance (via Meu Pluggy); o que não vier, como gastos em dinheiro, pode ser lançado à mão. Tudo fica num banco de dados próprio, num servidor em casa, acessado pelo celular através da Tailscale.

**Status:** Fase 0 do roadmap em andamento. O repositório já tem as três partes separadas; o backend e o frontend estão com TypeScript, ESLint, Prettier e Vitest configurados, e a API e o front vêm a seguir.

## Estrutura

Um único repositório git com três partes independentes:

| Pasta | O que é |
|---|---|
| [`backend/`](backend/) | API em Node + Fastify, com a sincronização do Open Finance. Projeto próprio (`package.json`, testes, `Dockerfile`) |
| [`frontend/`](frontend/) | App em React + Vite. Projeto próprio, servido por nginx em produção |
| [`infra/`](infra/README.md) | Docker Compose de desenvolvimento e de produção, e os scripts de backup |

Cada parte roda os próprios comandos dentro da sua pasta (`npm install`, `npm test`...). A lista completa está no [CLAUDE.md](CLAUDE.md#comandos).

## Documentação

| Documento | Conteúdo |
|---|---|
| [Produto](docs/01-produto.md) | Visão, princípios, funcionalidades, lançamento manual, o que fica de fora, comparação com o Pierre |
| [Open Finance e Meu Pluggy](docs/02-open-finance.md) | Como os dados chegam, limites, configuração passo a passo |
| [Arquitetura](docs/03-arquitetura.md) | Stack, estrutura do repositório, sincronização, decisões |
| [Modelo de dados](docs/04-modelo-de-dados.md) | Tabelas e regras do banco |
| [Deploy](docs/05-deploy.md) | Servidor Linux, Docker, Tailscale, backup |
| [Design System](docs/06-design-system.md) | Cores, tipografia, componentes, gráficos, tokens em CSS |
| [Roadmap](docs/07-roadmap.md) | Fases 0 a 3, com tarefas e critérios de pronto |
| [Identidade visual](docs/design/identidade-visual.md) | Guia original de identidade e o moodboard |
| [Figma do Valora](https://www.figma.com/design/MNdGWT8ZnSZkTRxlvoI0Ie/Valora) | Variáveis, componentes e telas do celular (em construção) |

## Stack

TypeScript · Fastify · PostgreSQL · Drizzle · React · Vite · Tailwind · shadcn/ui · Docker Compose · Tailscale
