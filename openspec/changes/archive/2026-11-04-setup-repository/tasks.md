## 1. Repositório e raiz

- [x] 1.1 Rodar `git init` e criar o `.gitignore` (node_modules, dist, coverage, `.env`, `.env.*`, com `!.env.example`) e o `.gitattributes`
- [x] 1.2 Criar `.editorconfig`, `.prettierrc.json` (estilo do CellCare), `.prettierignore` e `.nvmrc` (Node 26) na raiz, sem `package.json` na raiz

## 2. Backend

- [x] 2.1 Criar `backend/package.json` (`@valora/backend`, `engines` Node 26 e npm 11, scripts `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test`, `test:watch`) e `backend/.npmrc` com `engine-strict=true`
- [x] 2.2 Criar `backend/tsconfig.json` estrito com `NodeNext` e saída em `dist/`
- [x] 2.3 Criar `backend/eslint.config.js` (`typescript-eslint` strict, `no-explicit-any`, `consistent-type-imports`, imports em 3 grupos) e `backend/vitest.config.ts`
- [x] 2.4 Criar `backend/.env.example` sem valores reais
- [x] 2.5 Instalar as ferramentas no backend (`npm install -D ...` dentro da pasta)

## 3. Frontend

- [x] 3.1 Criar `frontend/package.json` (`@valora/frontend`, mesmos `engines` e scripts) e `frontend/.npmrc`
- [x] 3.2 Criar `frontend/tsconfig.json` estrito com `Bundler` e bibliotecas do DOM
- [x] 3.3 Criar `frontend/eslint.config.js` e `frontend/vitest.config.ts`
- [x] 3.4 Instalar as ferramentas no frontend

## 4. Infra

- [x] 4.1 Criar `infra/README.md` descrevendo o que vai morar na pasta e em qual change cada arquivo chega

## 5. Verificação

- [x] 5.1 Escrever o primeiro teste de cada parte (fuso `America/Sao_Paulo`), no padrão `should_..._when_...` com Arrange / Act / Assert
- [x] 5.2 Conferir em cada parte: `npm run typecheck`, `npm run lint`, `npm run format:check` e `npm test` passam, inclusive depois de `npm ci` com `node_modules` apagado
- [x] 5.3 Conferir que o lint falha com `any` explícito e com imports fora dos 3 grupos, e que o typecheck falha com erro de tipo
- [x] 5.4 Conferir com `git check-ignore` que `.env` é ignorado na raiz, em `backend/`, `frontend/` e `infra/`, e que os `.env.example` não são
- [x] 5.5 Conferir que o `engine-strict` faz a instalação falhar com Node incompatível (`EBADENGINE`)

## 6. Documentação

- [x] 6.1 Preencher a seção "Comandos" do `CLAUDE.md`
- [x] 6.2 Marcar como `[x]` os itens de "Projeto" da Fase 0 em `docs/07-roadmap.md`
