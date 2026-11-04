## Why

O Valora ainda não tem código. Antes de qualquer funcionalidade, o projeto precisa de um repositório organizado como o CellCare: um único repositório git com `backend/`, `frontend/` e `infra/` separados, cada parte independente, com TypeScript estrito, lint, formatação e testes configurados.

## What Changes

- Inicializa o repositório git, com `.gitignore` (bloqueia `.env` em qualquer pasta e libera os `.env.example`) e `.gitattributes`.
- Cria as configurações comuns na raiz: `.editorconfig`, `.prettierrc.json` (mesmo estilo do CellCare), `.prettierignore` e `.nvmrc` (Node 26). A raiz **não** é um projeto Node.
- Cria o `backend/` como projeto independente (`@valora/backend`). Ele tem:
  - os próprios `package.json` e `package-lock.json`;
  - `.npmrc` com `engine-strict`, `tsconfig.json` estrito (NodeNext), `eslint.config.js` e `vitest.config.ts`;
  - `.env.example` e um primeiro teste.
- Cria o `frontend/` como projeto independente (`@valora/frontend`), com a mesma base de ferramentas e um primeiro teste. O app React chega na `setup-web-foundation`.
- Cria o `infra/` com um `README.md` que descreve o que vai morar ali: Compose de desenvolvimento e de produção, `.env.example` e scripts de backup.
- Cada projeto tem os scripts `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test` e `test:watch`.
- Preenche a seção "Comandos" do `CLAUDE.md`.

Itens do roadmap cobertos (docs/07-roadmap.md, Fase 0 → Projeto):
- Repositório git com `.gitignore` e `.env.example`.
- Repositório com `backend/`, `frontend/` e `infra/` separados.
- TypeScript com `strict: true` no backend e no frontend.
- ESLint e Prettier.
- Vitest configurado no backend e no frontend.

## Capabilities

### New Capabilities

- `project-tooling`: estrutura do repositório em partes independentes, TypeScript estrito, lint, formatação, testes, versões fixadas e scripts padrão de cada parte.

### Modified Capabilities

Nenhuma.

## Impact

- **Arquivos novos na raiz:** `.gitignore`, `.gitattributes`, `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`.
- **Projetos novos:** `backend/` e `frontend/`, cada um com `package.json`, `package-lock.json`, `.npmrc`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts` e um primeiro teste. Mais `infra/README.md`.
- **Dependências de desenvolvimento (em cada projeto):** `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-simple-import-sort`, `prettier`, `vitest`; no backend, também `@types/node`.
- **Documentação:** seção "Comandos" do `CLAUDE.md` e itens marcados no roadmap.

## Fora do escopo

- Código de API, banco ou telas: ficam com `setup-api-foundation` e `setup-web-foundation`.
- Compose, Dockerfiles e scripts de backup: chegam em `setup-api-foundation` (Compose de desenvolvimento) e `deploy-home-server`.
- Código compartilhado entre back e front: as partes são independentes (veja o design).
- CI remoto (por exemplo, GitHub Actions): não está no roadmap.
