## Context

A pasta do projeto tinha só documentação (`docs/`, `docs/design/`, `CLAUDE.md`) e a configuração do OpenSpec. A primeira versão desta change montava um monorepo com npm workspaces e um pacote compartilhado (`packages/shared`). O usuário pediu outra organização, a mesma do CellCare: um único repositório git com `backend/`, `frontend/` e `infra/` separados, cada parte independente.

## Goals / Non-Goals

**Goals:**
- Cada parte se instala, testa, roda e vira imagem Docker sozinha.
- Mesmas regras de qualidade nas duas partes: TypeScript estrito, `any` proibido, imports em 3 grupos, mesmo estilo de formatação.
- Nenhum segredo entra no git.

**Non-Goals:**
- Fastify, Drizzle, React ou qualquer dependência de execução (vêm nas changes de fundação).
- Pipeline de CI.

## Decisions

**1. Um repositório, partes independentes, como no CellCare.**
- `backend/` e `frontend/` têm cada um o próprio `package.json`, `package-lock.json`, `node_modules`, `tsconfig.json`, `eslint.config.js` e `vitest.config.ts`.
- `infra/` guarda Docker Compose (desenvolvimento e produção) e scripts do servidor. O nome é `infra/`, e não `deploy/`, porque a pasta também tem o banco de desenvolvimento.
- O guia de identidade visual e o moodboard ficam em `docs/design/`, com nomes em minúsculas e sem espaço.
- Pastas em inglês, minúsculas, sem prefixo `valora-`: o repositório e os pacotes `@valora/backend` e `@valora/frontend` já identificam o projeto.
- A raiz não é um projeto Node: só tem as configurações comuns e a documentação.
- *Alternativa:* monorepo com npm workspaces e pacote compartilhado (primeira versão desta change). Foi descartada pelo usuário em 04/11/2026.

**2. Sem código compartilhado.**
- O front não importa nada do backend.
- O contrato da API é o backend. O front valida as respostas com os próprios schemas Zod, em `frontend/src/lib/api/`.
- Quando um endpoint muda, a mesma change atualiza os dois lados.
- Utilitários pequenos usados nos dois lados (fuso de São Paulo, centavos) existem duas vezes, cada um com os próprios testes.
- *Custo aceito:* um pouco de duplicação, em troca de partes que se entendem sozinhas.

**3. Configuração comum na raiz só onde as ferramentas procuram para cima.**
- `.prettierrc.json` e `.prettierignore` ficam na raiz: o Prettier de cada parte encontra o arquivo subindo as pastas. O estilo é o mesmo do CellCare: aspas simples, vírgula no final, 100 colunas.
- `.editorconfig`, `.gitattributes` e `.nvmrc` também ficam na raiz.
- ESLint, TypeScript e Vitest são configurados dentro de cada parte, porque o front vai ganhar regras de React e o back de Node.

**4. TypeScript.**
- Backend: `module` e `moduleResolution` em `NodeNext`, saída em `dist/` com `tsc` (como no CellCare). Imports relativos usam a extensão `.js`.
- Frontend: `moduleResolution` `Bundler`, porque quem compila é o Vite.
- Os dois com `strict`, `noUncheckedIndexedAccess` e `verbatimModuleSyntax`.
- **TypeScript 6.0, não 7.** O TypeScript 7 (o compilador novo, em Go) já saiu, mas o `typescript-eslint` 8.72 só aceita TypeScript abaixo de 6.1. A troca fica para quando o `typescript-eslint` aceitar a versão 7.

**5. ESLint igual nas duas partes, por enquanto.**
- `typescript-eslint` no modo `strict`, `no-explicit-any` como erro, `consistent-type-imports` e variáveis não usadas só com prefixo `_` (como no CellCare).
- `eslint-plugin-simple-import-sort` com os 3 grupos (externas, `@/`, locais). Ele é a dependência nova que garante a ordem de imports exigida nas convenções.
- A `setup-web-foundation` acrescenta as regras de React no front.

**6. Versões fixadas e gerenciador de pacotes.**
- `.nvmrc` com Node 26 (a LTS ativa) e `engines` em cada parte exigindo Node 26 e npm 11.
- `.npmrc` com `engine-strict=true` dentro de cada parte, porque o npm lê o `.npmrc` da pasta do projeto.
- npm, que já vem com o Node. O Node 26 não traz mais o Corepack, e o pnpm exigiria uma instalação a mais.
- Os `package-lock.json` são versionados, e o Docker instala com `npm ci`.

**7. Testes.**
Vitest em cada parte, no padrão `should_<comportamento>_when_<condição>` com Arrange / Act / Assert. O primeiro teste de cada parte trava o fuso `America/Sao_Paulo`, que toda data do app usa.

## Risks / Trade-offs

- [Duplicação de schemas e utilitários entre back e front] → Cada lado tem os próprios testes. Toda change que mexe num endpoint tem tarefa para os dois lados.
- [Configurações de ESLint repetidas nas duas partes] → São curtas e vão divergir de propósito (React no front, Node no back).
- [`engine-strict` pode travar a instalação em máquinas com outro Node] → `.nvmrc` deixa a troca a um comando (`nvm use`).
- [Vulnerabilidade moderada no `minimatch`, que vem por dentro do ESLint] → Só ferramentas de desenvolvimento, fora das imagens de produção. A "correção" automática rebaixaria o `typescript-eslint`, então não foi aplicada.

## Migration Plan

A versão anterior desta change (monorepo) nunca foi commitada. Os arquivos dela foram apagados e a estrutura nova foi criada no lugar. O primeiro commit segue Conventional Commits.

## Open Questions

Nenhuma.
